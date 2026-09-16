-- Run once in Supabase SQL Editor. Only backend service_role can use these RPCs.
create table if not exists public.canvas_daily_usage (
  day date not null,
  scope text not null,
  used integer not null default 0 check (used >= 0),
  last_request_at timestamptz,
  primary key (day, scope)
);
alter table public.canvas_daily_usage enable row level security;
revoke all on public.canvas_daily_usage from anon, authenticated;

create or replace function public.canvas_quota(p_user uuid, p_reserve boolean, p_user_limit integer, p_global_limit integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  d date := (now() at time zone 'UTC')::date;
  g integer; u integer; last_at timestamptz; why text := '';
begin
  if p_user_limit < 1 or p_global_limit < 1 then raise exception 'Invalid limits'; end if;
  if not exists (select 1 from auth.users where id = p_user and email_confirmed_at is not null) then raise exception 'Unverified user'; end if;
  insert into public.canvas_daily_usage(day,scope) values(d,'global') on conflict do nothing;
  -- Serialize reservations across all deployments: simultaneous requests cannot exceed cap.
  select used into g from public.canvas_daily_usage where day=d and scope='global' for update;
  insert into public.canvas_daily_usage(day,scope) values(d,p_user::text) on conflict do nothing;
  select used,last_request_at into u,last_at from public.canvas_daily_usage where day=d and scope=p_user::text for update;
  if g >= p_global_limit then why := 'global';
  elsif u >= p_user_limit then why := 'user';
  elsif p_reserve and last_at > now() - interval '60 seconds' then why := 'cooldown'; end if;
  if p_reserve and why = '' then
    update public.canvas_daily_usage set used=used+1 where day=d and scope='global';
    update public.canvas_daily_usage set used=used+1,last_request_at=now() where day=d and scope=p_user::text;
    g := g+1; u := u+1;
  end if;
  return jsonb_build_object('allowed',why='','reason',why,'remaining',greatest(0,p_user_limit-u),'globalRemaining',greatest(0,p_global_limit-g),'userLimit',p_user_limit,'globalLimit',p_global_limit,'resetsAt',((d+1)::timestamp at time zone 'UTC'));
end $$;
revoke all on function public.canvas_quota(uuid,boolean,integer,integer) from public, anon, authenticated;
grant execute on function public.canvas_quota(uuid,boolean,integer,integer) to service_role;
