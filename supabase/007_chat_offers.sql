-- Chat Offers — sistem de negociere in chat (stil Vinted)
-- Ambele parti pot trimite oferte de pret, cealalta parte accepta sau refuza

-- ─── 1. TABELA ──────────────────────────────────────────────

create table public.chat_offers (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create index chat_offers_conv_idx on public.chat_offers(conversation_id);
create index chat_offers_conv_status_idx on public.chat_offers(conversation_id, status);

-- ─── 2. RLS ─────────────────────────────────────────────────

alter table public.chat_offers enable row level security;

-- doar participantii conversatiei pot vedea ofertele
create policy "Chat offers visible to participants"
  on public.chat_offers for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.helped_id = auth.uid() or c.helper_id = auth.uid())
    )
  );

-- doar participantii pot crea oferte (si doar ca ei insisi)
create policy "Participants can create chat offers"
  on public.chat_offers for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.helped_id = auth.uid() or c.helper_id = auth.uid())
    )
  );

-- doar participantii pot updata (accept/decline)
create policy "Participants can update chat offers"
  on public.chat_offers for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.helped_id = auth.uid() or c.helper_id = auth.uid())
    )
  );


-- ─── 3. TRIGGER: invalideaza ofertele vechi pending ─────────

create or replace function public.invalidate_old_chat_offers()
returns trigger as $$
begin
  -- cand cineva trimite o oferta noua, cele vechi pending devin declined
  update public.chat_offers
  set status = 'declined'
  where conversation_id = new.conversation_id
    and status = 'pending'
    and id != new.id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_chat_offer_invalidate on public.chat_offers;
create trigger on_chat_offer_invalidate
  after insert on public.chat_offers
  for each row execute function public.invalidate_old_chat_offers();


-- ─── 4. TRIGGER: la accept → assign job ─────────────────────

create or replace function public.on_chat_offer_accepted()
returns trigger as $$
declare
  conv record;
begin
  -- doar cand statusul se schimba in 'accepted'
  if old.status = new.status then return new; end if;
  if new.status != 'accepted' then return new; end if;

  -- iau conversatia cu job_id si helper_id
  select job_id, helper_id into conv
  from public.conversations
  where id = new.conversation_id;

  -- 1. assign jobul
  update public.jobs
  set status = 'assigned',
      helper_id = conv.helper_id,
      updated_at = now()
  where id = conv.job_id
    and status = 'open';

  -- 2. accept oferta helperului din tabelul offers + actualizeaza pretul negociat
  update public.offers
  set status = 'accepted', price = new.amount
  where job_id = conv.job_id
    and helper_id = conv.helper_id;

  -- 3. reject restul ofertelor de la alti helperi
  update public.offers
  set status = 'rejected'
  where job_id = conv.job_id
    and helper_id != conv.helper_id
    and status = 'pending';

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_chat_offer_accept on public.chat_offers;
create trigger on_chat_offer_accept
  after update on public.chat_offers
  for each row execute function public.on_chat_offer_accepted();


-- ─── 5. TRIGGER: notificare la oferta noua ──────────────────

-- trebuie adaugat 'chat_offer' la check constraint-ul din notifications
-- ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
-- ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
--   CHECK (type in ('offer_received', 'offer_accepted', 'offer_rejected', 'job_completed', 'review_received', 'message', 'chat_offer'));

create or replace function public.notify_on_chat_offer()
returns trigger as $$
declare
  other_user_id uuid;
  sender_name text;
begin
  -- gaseste celalalt user din conversatie
  select case
    when c.helped_id = new.sender_id then c.helper_id
    else c.helped_id
  end into other_user_id
  from public.conversations c
  where c.id = new.conversation_id;

  -- numele senderului
  select full_name into sender_name
  from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    other_user_id,
    'chat_offer',
    'New price offer from ' || coalesce(sender_name, 'someone'),
    coalesce(sender_name, 'Someone') || ' sent a price offer of ' || new.amount || ' RON.',
    '/chat/' || new.conversation_id
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_chat_offer_notify on public.chat_offers;
create trigger on_chat_offer_notify
  after insert on public.chat_offers
  for each row execute function public.notify_on_chat_offer();
