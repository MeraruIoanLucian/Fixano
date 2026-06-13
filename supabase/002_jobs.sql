 Jobs table + RLS

-- 1. Create jobs table
create table public.jobs (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  category text not null check (category in (
    'Instalații Apă', 'Gaze', 'Electrice',
    'Centrale Termice', 'Climatizare', 'Altele'
  )),
  urgency text not null default 'medium' check (urgency in ('low', 'medium', 'urgent')),
  budget text,                              -- free-text like "200-400 RON"
  status text not null default 'open' check (status in ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  helper_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Enable RLS
alter table public.jobs enable row level security;

-- 3. Policies
-- Anyone logged in can see open jobs
create policy "Open jobs are viewable by everyone"
  on public.jobs for select
  using (true);

-- Only the owner (helped) can create a job
create policy "Users can insert own jobs"
  on public.jobs for insert
  with check (auth.uid() = owner_id);

-- Owner can update their own jobs
create policy "Owners can update own jobs"
  on public.jobs for update
  using (auth.uid() = owner_id);

-- Owner can delete their own jobs
create policy "Owners can delete own jobs"
  on public.jobs for delete
  using (auth.uid() = owner_id);

-- 4. Index for fast lookups
create index jobs_owner_id_idx on public.jobs(owner_id);
create index jobs_status_idx on public.jobs(status);
create index jobs_category_idx on public.jobs(category);

-- 5. Trigger for helper account deletion
create or replace function public.handle_job_helper_deleted()
returns trigger as $$
begin
  -- If the helper_id is set to null (because the helper deleted their account) 
  -- and the job was currently being worked on, revert it to 'open'
  if old.helper_id is not null and new.helper_id is null and old.status in ('assigned', 'in_progress', 'pending_completion') then
    new.status = 'open';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_job_helper_deleted
  before update on public.jobs
  for each row execute function public.handle_job_helper_deleted();
