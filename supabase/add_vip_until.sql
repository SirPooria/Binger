-- Migration: Add vip_until to profiles table for subscription expiration tracking
-- Run in Supabase SQL Editor if you want to store vip_until directly in the profiles table.

alter table public.profiles
  add column if not exists vip_until timestamptz;

create index if not exists profiles_vip_until_idx
  on public.profiles(vip_until);

-- Function to check subscription days remaining from PostgreSQL (optional)
create or replace function public.get_subscription_days_remaining(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_is_vip boolean;
  v_vip_until timestamptz;
  v_updated_at timestamptz;
  v_created_at timestamptz;
  v_expiry timestamptz;
  v_days integer;
begin
  select role, coalesce(is_vip, false), vip_until, updated_at, created_at
    into v_role, v_is_vip, v_vip_until, v_updated_at, v_created_at
  from public.profiles
  where id = p_user_id;

  if v_role = 'admin' then
    return 999;
  end if;

  if v_vip_until is not null then
    v_days := ceil(extract(epoch from (v_vip_until - now())) / 86400);
    return greatest(0, v_days);
  end if;

  if v_is_vip then
    v_expiry := coalesce(v_updated_at, v_created_at, now()) + interval '30 days';
    v_days := ceil(extract(epoch from (v_expiry - now())) / 86400);
    if v_days > 0 then
      return v_days;
    else
      -- 30-day recurring fallback
      return 30 - (floor(extract(epoch from (now() - coalesce(v_updated_at, v_created_at, now()))) / 86400)::integer % 30);
    end if;
  end if;

  return 0;
end;
$$;
