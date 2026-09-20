-- Daily AI recommendation quota for Binger Mood Chat.
-- Run this once in the Supabase SQL Editor.

create table if not exists public.mood_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.mood_ai_usage enable row level security;

drop policy if exists "users read own mood ai usage" on public.mood_ai_usage;
create policy "users read own mood ai usage"
  on public.mood_ai_usage for select using (auth.uid() = user_id);

create or replace function public.get_mood_ai_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  vip boolean;
  used_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select coalesce(is_vip, false) into vip
  from public.profiles
  where id = auth.uid();

  select request_count into used_count
  from public.mood_ai_usage
  where user_id = auth.uid() and usage_date = current_date;

  return json_build_object(
    'is_vip', coalesce(vip, false),
    'remaining', case when coalesce(vip, false) then null else greatest(0, 1 - coalesce(used_count, 0)) end
  );
end;
$$;

create or replace function public.consume_mood_ai_credit()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  vip boolean;
  current_count integer;
  new_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select coalesce(is_vip, false) into vip
  from public.profiles
  where id = auth.uid();

  if coalesce(vip, false) then
    return json_build_object('allowed', true, 'is_vip', true, 'remaining', null);
  end if;

  insert into public.mood_ai_usage (user_id, usage_date, request_count)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, usage_date) do update
    set request_count = public.mood_ai_usage.request_count + 1,
        updated_at = now()
    where public.mood_ai_usage.request_count < 1
  returning request_count into new_count;

  if new_count is null then
    select request_count into current_count
    from public.mood_ai_usage
    where user_id = auth.uid() and usage_date = current_date;
    return json_build_object('allowed', false, 'is_vip', false, 'remaining', 0);
  end if;

  return json_build_object('allowed', true, 'is_vip', false, 'remaining', greatest(0, 1 - new_count));
end;
$$;

grant execute on function public.get_mood_ai_status() to authenticated;
grant execute on function public.consume_mood_ai_credit() to authenticated;
