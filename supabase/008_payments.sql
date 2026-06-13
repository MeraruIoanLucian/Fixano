-- Payments — sistem de plati prin Stripe Connect
-- Homeowner-ul plateste la acceptarea ofertei, banii stau pe platforma,
-- la confirmare se face transfer la helper

-- ─── 1. TABELA ──────────────────────────────────────────────

create table public.payments (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null unique,
  payer_id uuid references public.profiles(id) on delete cascade not null,
  payee_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  currency text not null default 'ron',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'held_by_platform', 'transferred', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  transferred_at timestamptz
);

create index payments_job_idx on public.payments(job_id);
create index payments_payer_idx on public.payments(payer_id);
create index payments_payee_idx on public.payments(payee_id);

-- ─── 2. RLS ─────────────────────────────────────────────────

alter table public.payments enable row level security;

-- payer-ul (homeowner) poate vedea platile pe care le-a facut
create policy "Payers can view own payments"
  on public.payments for select
  using (auth.uid() = payer_id);

-- payee-ul (helper) poate vedea platile primite
create policy "Payees can view received payments"
  on public.payments for select
  using (auth.uid() = payee_id);

-- insert se face doar din Edge Functions (service role), nu din client
-- deci nu punem policy de insert pt useri normali


-- ─── 3. STRIPE ACCOUNT PE PROFILES ─────────────────────────

-- adaugam coloana stripe_account_id pe profiles
-- helperii isi conecteaza contul Stripe Express aici
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_account_id text;
