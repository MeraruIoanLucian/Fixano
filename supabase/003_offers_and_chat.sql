-- Offers + Conversations + Messages

-- ─── 1. OFFERS ──────────────────────────────────────────────

create table public.offers (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  helper_id uuid references public.profiles(id) on delete cascade not null,
  price numeric not null,
  message text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),

  -- un helper poate trimite o singura oferta per job
  unique(job_id, helper_id)
);

alter table public.offers enable row level security;

-- Oricine logat poate vedea ofertele (needed for job owner to see them)
create policy "Offers are viewable by participants"
  on public.offers for select
  using (
    auth.uid() = helper_id
    or auth.uid() = (select owner_id from public.jobs where id = job_id)
  );

-- Doar helperii pot crea oferte pe joburi care nu le apartin
create policy "Helpers can insert offers"
  on public.offers for insert
  with check (
    auth.uid() = helper_id
    and auth.uid() != (select owner_id from public.jobs where id = job_id)
  );

-- Helper-ul isi poate updata propria oferta (retragere)
-- Owner-ul jobului poate updata status (accept/reject)
create policy "Participants can update offers"
  on public.offers for update
  using (
    auth.uid() = helper_id
    or auth.uid() = (select owner_id from public.jobs where id = job_id)
  );

create index offers_job_id_idx on public.offers(job_id);
create index offers_helper_id_idx on public.offers(helper_id);


-- ─── 2. CONVERSATIONS ──────────────────────────────────────

create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  helped_id uuid references public.profiles(id) on delete cascade not null,
  helper_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),

  -- un singur chat per pereche job + helper
  unique(job_id, helper_id)
);

alter table public.conversations enable row level security;

-- Doar participantii pot vedea conversatia
create policy "Conversations visible to participants"
  on public.conversations for select
  using (auth.uid() = helped_id or auth.uid() = helper_id);

-- Orice user autentificat poate crea o conversatie
-- (se creaza automat la trimiterea ofertei)
create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (auth.uid() = helped_id or auth.uid() = helper_id);

create index conversations_job_id_idx on public.conversations(job_id);
create index conversations_helped_id_idx on public.conversations(helped_id);
create index conversations_helper_id_idx on public.conversations(helper_id);


-- ─── 3. MESSAGES ────────────────────────────────────────────

create table public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  body text not null,
  type text not null default 'text'
    check (type in ('text', 'image')),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Doar participantii conversatiei pot citi mesajele
create policy "Messages visible to conversation participants"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.helped_id = auth.uid() or c.helper_id = auth.uid())
    )
  );

-- Doar participantii pot trimite mesaje (si doar ca ei insisi)
create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.helped_id = auth.uid() or c.helper_id = auth.uid())
    )
  );

create index messages_conversation_id_idx on public.messages(conversation_id);
create index messages_conv_created_idx on public.messages(conversation_id, created_at);
