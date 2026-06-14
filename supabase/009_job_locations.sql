-- Add location fields to jobs table

alter table public.jobs 
add column city text not null default '-',
add column street text not null default '-',
add column building text not null default '-',
add column apartment text not null default '-';
