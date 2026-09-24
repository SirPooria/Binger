-- Binger Production Security Migration
-- Safe, idempotent, non-destructive SQL enhancements for production deployment.

-- 1. Secure achievement_events: remove public insert policy and enforce server/RPC-only recording
drop policy if exists "users create own achievement events" on public.achievement_events;

create or replace function public.record_achievement_event(
  p_event_type text,
  p_show_id bigint default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_exists boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Validate event type against strict allowlist
  if p_event_type not in (
    'easter_egg_found',
    'profile_shared',
    'show_shared',
    'randomizer_completed',
    'chronological_completed',
    'advocacy_click'
  ) then
    raise exception 'invalid_event_type';
  end if;

  -- Idempotency check: don't duplicate events for same user, type, and show
  select exists(
    select 1 from public.achievement_events
    where user_id = v_user_id
      and event_type = p_event_type
      and (
        (show_id is null and p_show_id is null) or
        (show_id = p_show_id)
      )
  ) into v_exists;

  if v_exists then
    return jsonb_build_object('success', true, 'recorded', false, 'reason', 'already_exists');
  end if;

  insert into public.achievement_events (user_id, event_type, show_id, metadata)
  values (v_user_id, p_event_type, p_show_id, coalesce(p_metadata, '{}'::jsonb));

  return jsonb_build_object('success', true, 'recorded', true);
end;
$$;

grant execute on function public.record_achievement_event(text, bigint, jsonb) to authenticated;

-- 2. Rollbackable Mood AI Quota: refund credit if downstream LLM/fetch fails
create or replace function public.restore_mood_ai_credit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_updated integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  update public.mood_ai_usage
  set request_count = greatest(0, request_count - 1),
      updated_at = now()
  where user_id = v_user_id
    and usage_date = current_date
    and request_count > 0;

  get diagnostics v_updated = row_count;

  return jsonb_build_object('success', true, 'restored', v_updated > 0, 'remaining', 1);
end;
$$;

grant execute on function public.restore_mood_ai_credit() to authenticated;

-- 3. Server-side aggregated and paginated leaderboard with zero PII
create or replace function public.get_global_leaderboard(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  is_vip boolean,
  score bigint,
  rank bigint,
  episodes_count bigint,
  comments_count bigint,
  followers_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with user_stats as (
    select
      p.id as user_id,
      coalesce(p.username, 'کاربر بینجر') as username,
      coalesce(p.avatar_url, '😎') as avatar_url,
      coalesce(p.is_vip, false) as is_vip,
      coalesce(w.cnt, 0) as episodes_count,
      coalesce(c.cnt, 0) as comments_count,
      coalesce(f.cnt, 0) as followers_count,
      ((coalesce(w.cnt, 0) * 10) + (coalesce(c.cnt, 0) * 5) + (coalesce(f.cnt, 0) * 2)) as score
    from public.profiles p
    left join (
      select user_id, count(*)::bigint as cnt
      from public.watched
      group by user_id
    ) w on w.user_id = p.id
    left join (
      select user_id, count(*)::bigint as cnt
      from public.comments
      group by user_id
    ) c on c.user_id = p.id
    left join (
      select following_id, count(*)::bigint as cnt
      from public.follows
      group by following_id
    ) f on f.following_id = p.id
  ),
  ranked as (
    select
      user_id,
      username,
      avatar_url,
      is_vip,
      score,
      row_number() over (order by score desc, user_id asc) as rank,
      episodes_count,
      comments_count,
      followers_count
    from user_stats
  )
  select * from ranked
  order by rank asc
  limit greatest(1, least(100, p_limit))
  offset greatest(0, p_offset);
$$;

grant execute on function public.get_global_leaderboard(integer, integer) to authenticated, anon;

-- 4. Server-side Admin Verification Helper
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- 5. Trigger to prevent non-admins / clients from modifying sensitive columns (role, is_vip)
create or replace function public.protect_sensitive_profile_columns()
returns trigger
language plpgsql
security definer
as $$
begin
  -- If invoked via service_role, allow modifications
  if current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  -- Disallow regular authenticated users from altering role or is_vip
  if (new.role is distinct from old.role) then
    raise exception 'Unauthorized to modify role column';
  end if;

  if (new.is_vip is distinct from old.is_vip) then
    raise exception 'Unauthorized to modify is_vip column';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_sensitive_profile_columns on public.profiles;
create trigger trg_protect_sensitive_profile_columns
  before update on public.profiles
  for each row
  execute function public.protect_sensitive_profile_columns();
