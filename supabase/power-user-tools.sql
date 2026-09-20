-- Power User Tools: custom-list limits, VIP pinning, and profile insights support.
-- Run once in the Supabase SQL Editor.

alter table public.user_lists
  add column if not exists is_pinned boolean not null default false;

create index if not exists user_lists_user_pinned_idx
  on public.user_lists(user_id, is_pinned);

create or replace function public.create_custom_list(
  p_title text,
  p_description text default '',
  p_is_public boolean default true
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  vip boolean;
  list_count integer;
  next_order integer;
  new_list_id text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select coalesce(is_vip, false) into vip
  from public.profiles
  where id = auth.uid();

  select count(*)::integer, coalesce(max(order_index), -1) + 1
    into list_count, next_order
  from public.user_lists
  where user_id = auth.uid();

  if not coalesce(vip, false) and list_count >= 3 then
    return json_build_object('allowed', false, 'reason', 'limit_reached', 'limit', 3);
  end if;

  insert into public.user_lists (user_id, title, description, is_public, order_index)
  values (auth.uid(), trim(p_title), trim(coalesce(p_description, '')), p_is_public, next_order)
  returning id::text into new_list_id;

  return json_build_object('allowed', true, 'list_id', new_list_id, 'is_vip', coalesce(vip, false));
end;
$$;

create or replace function public.pin_custom_list(p_list_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  vip boolean;
  target_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select coalesce(is_vip, false) into vip
  from public.profiles
  where id = auth.uid();

  if not coalesce(vip, false) then
    return json_build_object('allowed', false, 'reason', 'vip_required');
  end if;

  select exists(
    select 1 from public.user_lists
    where user_id = auth.uid() and id::text = p_list_id
  ) into target_exists;

  if not target_exists then
    return json_build_object('allowed', false, 'reason', 'list_not_found');
  end if;

  update public.user_lists
  set is_pinned = (id::text = p_list_id)
  where user_id = auth.uid();

  return json_build_object('allowed', true, 'list_id', p_list_id);
end;
$$;

grant execute on function public.create_custom_list(text, text, boolean) to authenticated;
grant execute on function public.pin_custom_list(text) to authenticated;
