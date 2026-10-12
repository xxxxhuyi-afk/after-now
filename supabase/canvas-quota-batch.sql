-- Review, then run in Supabase SQL Editor BEFORE deploying the batch code.
-- Requires the existing canvas_daily_usage table; preserves all usage and the legacy RPC.
begin;
create or replace function public.canvas_quota_batch(
  p_user uuid, p_count integer, p_user_limit integer, p_global_limit integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  d date := (now() at time zone 'UTC')::date;
  g integer; u integer; last_at timestamptz; why text := '';
begin
  if p_count is null or p_count < 1 or p_count > 4 then raise exception 'Invalid batch count'; end if;
  if p_user_limit is null or p_global_limit is null or p_user_limit < 1 or p_global_limit < 1 then raise exception 'Invalid limits'; end if;
  if not exists (select 1 from auth.users where id = p_user and email_confirmed_at is not null) then raise exception 'Unverified user'; end if;
  insert into public.canvas_daily_usage(day,scope) values(d,'global') on conflict do nothing;
  -- Same global-then-user lock order as canvas_quota: old and new clients share caps.
  select used into g from public.canvas_daily_usage where day=d and scope='global' for update;
  insert into public.canvas_daily_usage(day,scope) values(d,p_user::text) on conflict do nothing;
  select used,last_request_at into u,last_at from public.canvas_daily_usage where day=d and scope=p_user::text for update;
  if g > p_global_limit - p_count then why := 'global';
  elsif u > p_user_limit - p_count then why := 'user';
  elsif last_at > now() - interval '60 seconds' then why := 'cooldown'; end if;
  if why = '' then
    update public.canvas_daily_usage set used=used+p_count where day=d and scope='global';
    update public.canvas_daily_usage set used=used+p_count,last_request_at=now() where day=d and scope=p_user::text;
    g := g+p_count; u := u+p_count;
  end if;
  return jsonb_build_object('allowed',why='','reason',why,'reserved',case when why='' then p_count else 0 end,
    'remaining',greatest(0,p_user_limit-u),'globalRemaining',greatest(0,p_global_limit-g),
    'userLimit',p_user_limit,'globalLimit',p_global_limit,'resetsAt',((d+1)::timestamp at time zone 'UTC'));
end $$;
revoke all on function public.canvas_quota_batch(uuid,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.canvas_quota_batch(uuid,integer,integer,integer) to service_role;
commit;
