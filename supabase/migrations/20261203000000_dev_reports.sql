-- Versus: Bug-Meldungen von Dev-Konten mit Schnappschuss (DEV-Panel → Bugs, js/devtools.js).
-- Alle Dev-Konten sehen alle Meldungen und können sie abhaken. Im SQL-Editor ausführen.

create table if not exists public.dev_reports (
  id bigserial primary key,
  user_id uuid references auth.users (id) on delete set null,
  username text,
  created_at timestamptz not null default now(),
  txt text not null,
  game text,
  v text,
  errs integer not null default 0,
  snap jsonb not null default '{}'::jsonb,
  done boolean not null default false,
  done_by text
);
create index if not exists dev_reports_at_idx on public.dev_reports (created_at desc);
alter table public.dev_reports enable row level security;   -- nur über die Funktionen unten

create or replace function public.dev_report(txt text, game text default null, snap jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); t text := trim(coalesce(txt, '')); rid bigint;
begin
  if not public.is_dev(u) then raise exception 'Nur für Dev-Konten.'; end if;
  if char_length(t) < 3 then raise exception 'Bitte kurz beschreiben, was passiert ist.'; end if;
  if (select count(*) from public.dev_reports r where r.user_id = u and r.created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Zu viele Meldungen. Warte kurz.';
  end if;
  if snap is null or jsonb_typeof(snap) <> 'object' or pg_column_size(snap) > 300000 then snap := jsonb_build_object('hinweis', 'Schnappschuss zu groß oder ungültig'); end if;
  insert into public.dev_reports (user_id, username, txt, game, v, errs, snap)
  values (u, (select p.username from public.profiles p where p.id = u), left(t, 2000), left(nullif(trim(game), ''), 20),
    left(snap ->> 'v', 10), coalesce(jsonb_array_length(case when jsonb_typeof(snap -> 'err') = 'array' then snap -> 'err' end), 0), snap)
  returning id into rid;
  return rid;
end;
$$;
revoke all on function public.dev_report(text, text, jsonb) from public, anon;
grant execute on function public.dev_report(text, text, jsonb) to authenticated;

-- Liste ohne Schnappschuss (der kommt einzeln mit dev_report_snap)
create or replace function public.dev_reports(lim integer default 60)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_dev(public.me()) then raise exception 'Nur für Dev-Konten.'; end if;
  return (select coalesce(jsonb_agg(x.j order by x.t desc), '[]'::jsonb) from (
    select r.created_at as t, jsonb_build_object('id', r.id, 'at', r.created_at, 'txt', r.txt, 'game', r.game, 'v', r.v, 'errs', r.errs,
      'name', coalesce((select p.username from public.profiles p where p.id = r.user_id), r.username), 'done', r.done, 'by', r.done_by) as j
    from public.dev_reports r order by r.done, r.created_at desc limit least(greatest(lim, 1), 200)) x);
end;
$$;
revoke all on function public.dev_reports(integer) from public, anon;
grant execute on function public.dev_reports(integer) to authenticated;

create or replace function public.dev_report_snap(rid bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_dev(public.me()) then raise exception 'Nur für Dev-Konten.'; end if;
  return (select r.snap from public.dev_reports r where r.id = rid);
end;
$$;
revoke all on function public.dev_report_snap(bigint) from public, anon;
grant execute on function public.dev_report_snap(bigint) to authenticated;

create or replace function public.dev_report_done(rid bigint, done boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  if not public.is_dev(u) then raise exception 'Nur für Dev-Konten.'; end if;
  update public.dev_reports r set done = dev_report_done.done,
    done_by = case when dev_report_done.done then (select p.username from public.profiles p where p.id = u) end
  where r.id = rid;
end;
$$;
revoke all on function public.dev_report_done(bigint, boolean) from public, anon;
grant execute on function public.dev_report_done(bigint, boolean) to authenticated;
