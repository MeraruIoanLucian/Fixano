-- ============================================================
-- HomeHelp: Reviews + Rating System
-- ============================================================

-- ─── 1. REVIEWS ─────────────────────────────────────────────

create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  reviewed_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  comment text default '',
  created_at timestamptz not null default now(),

  -- un singur review per job per reviewer
  unique(job_id, reviewer_id)
);

alter table public.reviews enable row level security;

-- Oricine logat poate vedea reviewurile (sunt publice)
create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (true);

-- Participantii (owner si helper) pot lasa review pe joburi completed
create policy "Participants can insert review on completed jobs"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.jobs j
      where j.id = job_id
        and j.status = 'completed'
        and (j.owner_id = auth.uid() or j.helper_id = auth.uid())
    )
  );

create index reviews_job_id_idx on public.reviews(job_id);
create index reviews_reviewed_id_idx on public.reviews(reviewed_id);


-- ─── 2. TRIGGER: Update rating_avg si rating_count ──────────

create or replace function public.update_profile_rating()
returns trigger as $$
begin
  update public.profiles
  set
    rating_avg = (
      select coalesce(avg(rating), 0)
      from public.reviews
      where reviewed_id = new.reviewed_id
    ),
    rating_count = (
      select count(*)
      from public.reviews
      where reviewed_id = new.reviewed_id
    )
  where id = new.reviewed_id;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_review_created
  after insert on public.reviews
  for each row execute function public.update_profile_rating();
