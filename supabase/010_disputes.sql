-- Disputes and Escalations

-- 1. Add dispute columns to jobs
alter table public.jobs
add column dispute_reason text,
add column dispute_reporter_id uuid references public.profiles(id) on delete set null;

-- 2. Update status constraint to allow 'disputed' and 'escalated'
-- (Note: we drop the old constraint and add the new one)
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check 
check (status in ('open', 'assigned', 'pending_completion', 'completed', 'cancelled', 'disputed', 'escalated'));
