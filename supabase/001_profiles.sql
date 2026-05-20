-- Profiles table + RLS

-- 1. Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('helped', 'helper')),
  full_name text not null default '',
  phone text not null default '',
  city text not null default '',
  avatar_url text,
  bio text,
  rating_avg numeric not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Enable RLS
alter table public.profiles enable row level security;

-- 3. Policies
-- Anyone can read profiles (public directory)
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Users can insert their own profile (on signup)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can update only their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
