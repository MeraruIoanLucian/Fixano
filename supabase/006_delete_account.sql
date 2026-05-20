-- HomeHelp: Delete Account function
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Functie SECURITY DEFINER care sterge userul din auth.users
-- Profilele, joburile, mesajele etc. se sterg automat prin ON DELETE CASCADE
create or replace function public.delete_own_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

-- Doar userii autentificati pot apela functia
revoke execute on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
