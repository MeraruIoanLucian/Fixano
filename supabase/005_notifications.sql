-- Tabel pentru notificari in-app

create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('offer_received', 'offer_accepted', 'offer_rejected', 'job_completed', 'review_received', 'message')),
  title text not null,
  body text not null default '',
  link text,                   -- URL relativ pt navigare (ex: /jobs/abc)
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- index pt query rapid
create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_user_unread_idx on public.notifications(user_id, is_read) where is_read = false;

-- RLS
alter table public.notifications enable row level security;

-- userii vad doar propriile notificari
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- userii pot marca notificarile ca citite
create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- inserarea e controlata server-side (trigger sau edge function) dar permitem si insert pt user propriu
create policy "Users can insert own notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);

-- trigger: cand se creeaza un review, notifica persoana evaluata
create or replace function public.notify_on_review()
returns trigger as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  values (
    new.reviewed_id,
    'review_received',
    'New review received',
    'Someone left a ' || new.rating || '-star review on your profile.',
    '/profile/' || new.reviewed_id
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_review_notify on public.reviews;
create trigger on_review_notify
  after insert on public.reviews
  for each row execute function public.notify_on_review();

-- trigger: cand se creeaza o oferta, notifica ownerul jobului
create or replace function public.notify_on_offer()
returns trigger as $$
declare
  job_owner_id uuid;
  job_title text;
begin
  select owner_id, title into job_owner_id, job_title
  from public.jobs where id = new.job_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    job_owner_id,
    'offer_received',
    'New offer received',
    'You received a new offer on "' || job_title || '".',
    '/jobs/' || new.job_id
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_offer_notify on public.offers;
create trigger on_offer_notify
  after insert on public.offers
  for each row execute function public.notify_on_offer();

-- trigger: cand se trimite un mesaj, notifica celalalt participant
create or replace function public.notify_on_message()
returns trigger as $$
declare
  other_user_id uuid;
  sender_name text;
  conv_id uuid;
begin
  conv_id := new.conversation_id;

  -- gaseste celalalt user din conversatie
  select case
    when c.helped_id = new.sender_id then c.helper_id
    else c.helped_id
  end into other_user_id
  from public.conversations c
  where c.id = conv_id;

  -- numele senderului
  select full_name into sender_name
  from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    other_user_id,
    'message',
    'New message from ' || coalesce(sender_name, 'someone'),
    case
      when new.type = 'image' then '📷 Sent a photo'
      else left(new.body, 80)
    end,
    '/chat/' || conv_id
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_message_notify on public.messages;
create trigger on_message_notify
  after insert on public.messages
  for each row execute function public.notify_on_message();

-- trigger: cand o oferta e acceptata/respinsa, notifica helperul
create or replace function public.notify_on_offer_status()
returns trigger as $$
declare
  job_title text;
begin
  -- doar cand statusul se schimba din 'pending' in altceva
  if old.status = new.status then return new; end if;
  if new.status not in ('accepted', 'rejected') then return new; end if;

  select title into job_title
  from public.jobs where id = new.job_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    new.helper_id,
    case when new.status = 'accepted' then 'offer_accepted' else 'offer_rejected' end,
    case when new.status = 'accepted' then 'Offer accepted! 🎉' else 'Offer declined' end,
    'Your offer on "' || coalesce(job_title, 'a job') || '" was ' || new.status || '.',
    '/jobs/' || new.job_id
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_offer_status_notify on public.offers;
create trigger on_offer_status_notify
  after update on public.offers
  for each row execute function public.notify_on_offer_status();

-- trigger: cand statusul unui job se schimba, notifica helperul asignat
create or replace function public.notify_on_job_status()
returns trigger as $$
begin
  -- doar cand statusul se schimba si exista un helper asignat
  if old.status = new.status then return new; end if;
  if new.helper_id is null then return new; end if;
  -- nu notifica daca helperul e cel care face schimbarea
  if auth.uid() = new.helper_id then return new; end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    new.helper_id,
    'job_completed',
    'Job status updated',
    '"' || new.title || '" is now ' || replace(new.status, '_', ' ') || '.',
    '/jobs/' || new.id
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_job_status_notify on public.jobs;
create trigger on_job_status_notify
  after update on public.jobs
  for each row execute function public.notify_on_job_status();
