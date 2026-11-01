-- Versus: Feedback aus der App (Bug, Idee, Sonstiges) mit Tab "Feedback" im Admin-Panel
-- Geht auch ohne Konto. Grenzen gegen Spam: pro Konto 5 in 10 Minuten, ohne Konto zusammen 40 pro Stunde.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  username text,
  kind text not null check (kind in ('bug', 'idea', 'other')),
  txt text not null check (char_length(txt) between 3 and 1000),
  game text check (char_length(game) <= 20),
  meta jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'done')),
  handled_by text,
  created_at timestamptz not null default now()
);
create index if not exists feedback_time_idx on public.feedback (created_at desc);
create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);
alter table public.feedback enable row level security;   -- nur über die Funktionen unten

-- meta: Version, Sprache, Gerät (nur ein paar kurze Felder, alles andere wird verworfen)
create or replace function public.send_feedback(kind text, txt text, game text default null, meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); t text := trim(coalesce(txt, '')); m jsonb := '{}'::jsonb; k text;
begin
  if kind not in ('bug', 'idea', 'other') then raise exception 'Wähl bitte eine Art.'; end if;
  if char_length(t) < 3 then raise exception 'Schreib bitte ein paar Worte mehr.'; end if;
  if u is not null then
    if (select count(*) from public.feedback f where f.user_id = u and f.created_at > now() - interval '10 minutes') >= 5 then
      raise exception 'Zu viele Nachrichten. Warte kurz und versuch es dann nochmal.';
    end if;
  elsif (select count(*) from public.feedback f where f.user_id is null and f.created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Zu viele Nachrichten. Warte kurz und versuch es dann nochmal.';
  end if;
  foreach k in array array['v', 'lang', 'dev', 'mode', 'discord'] loop
    if meta ? k then m := m || jsonb_build_object(k, left(meta ->> k, 40)); end if;
  end loop;
  insert into public.feedback (user_id, username, kind, txt, game, meta)
  values (u, (select p.username from public.profiles p where p.id = u), kind, left(t, 1000), left(nullif(trim(game), ''), 20), m);
end;
$$;
revoke all on function public.send_feedback(text, text, text, jsonb) from public;
grant execute on function public.send_feedback(text, text, text, jsonb) to anon, authenticated;

-- st: 'open' | 'all'; open = Anzahl offener Einträge für das Abzeichen am Tab
create or replace function public.admin_feedback(st text default 'open', lim integer default 80)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare res jsonb;
begin
  perform public.require_admin();
  select coalesce(jsonb_agg(x.j order by x.t desc), '[]'::jsonb) into res from (
    select f.created_at as t, jsonb_build_object('id', f.id, 'kind', f.kind, 'txt', f.txt, 'game', f.game, 'meta', f.meta,
      'name', coalesce((select p.username from public.profiles p where p.id = f.user_id), f.username),
      'guest', (select p.guest from public.profiles p where p.id = f.user_id),
      'status', f.status, 'by', f.handled_by, 'at', f.created_at) as j
    from public.feedback f
    where st = 'all' or f.status = 'open'
    order by f.created_at desc
    limit least(greatest(lim, 1), 200)) x;
  return jsonb_build_object('open', (select count(*) from public.feedback where status = 'open'), 'list', res);
end;
$$;

create or replace function public.admin_feedback_done(fid bigint, done boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.feedback set status = case when done then 'done' else 'open' end,
    handled_by = case when done then (select p.username from public.profiles p where p.id = auth.uid()) end
  where id = fid;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['admin_feedback(text, integer)', 'admin_feedback_done(bigint, boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
