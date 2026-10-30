-- Versus: mehr Admin-Werkzeuge für viele (auch internationale) Spieler und den öffentlichen Start
-- 1. Seitenzustand: Ankündigung auf Deutsch und Englisch mit Ablaufzeit, Notschalter für neue Konten und Gäste,
--    automatisches Ausblenden nach Meldungen von mehreren Spielern
-- 2. Verwarnungen: ein Spieler sieht den Text beim nächsten Öffnen, bevor man sperren muss
-- 3. Sprache pro Spieler (de/en), damit das Team weiß, wie es schreiben muss
-- 4. Spielerliste mit Filtern (Neu, Gemeldet, Gesperrt, Gäste, Ausgeblendet) und mehr Infos pro Spieler
-- 5. Online-Tische im Partie-Protokoll, Tische annullieren
-- 6. Übersicht: Verlauf der letzten 14 Tage, Gäste, Sprachen, offene Meldungen, laufende Tische
-- 7. Owner: alte Gastkonten aufräumen

-- ---------- 1. Seitenzustand ----------
create table if not exists public.site_state (
  id smallint primary key default 1 check (id = 1),
  txt text check (char_length(txt) <= 300),
  txt_en text check (char_length(txt_en) <= 300),
  kind text not null default 'info' check (kind in ('info', 'warn')),
  until timestamptz,
  at timestamptz not null default now(),
  signups boolean not null default true,   -- false: keine neuen Konten
  guests boolean not null default true,    -- false: kein neuer Gast-Zugang
  auto_hide smallint not null default 3 check (auto_hide between 0 and 20)   -- so viele Melder in 24 h blenden aus, 0 = aus
);
insert into public.site_state (id) values (1) on conflict do nothing;
alter table public.site_state enable row level security;   -- nur über die Funktionen unten

-- für alle, auch ohne Konto: Ankündigung (nur solange gültig) und ob man Konten anlegen kann
create or replace function public.site_notice()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'txt', case when s.until is null or s.until > now() then s.txt end,
    'txt_en', case when s.until is null or s.until > now() then s.txt_en end,
    'kind', s.kind, 'until', s.until, 'at', s.at, 'signups', s.signups, 'guests', s.guests)
  from public.site_state s where s.id = 1;
$$;
revoke all on function public.site_notice() from public;
grant execute on function public.site_notice() to anon, authenticated;

-- leerer Text: Ankündigung weg; hours null: bleibt, bis man sie wegnimmt
create or replace function public.admin_set_notice(txt text, txt_en text default null, hours integer default null, kind text default 'info')
returns void language plpgsql security definer set search_path = '' as $$
declare t text := nullif(trim(coalesce(txt, '')), ''); te text := nullif(trim(coalesce(txt_en, '')), '');
begin
  perform public.require_admin();
  if char_length(t) > 300 or char_length(te) > 300 then raise exception 'Die Ankündigung hat höchstens 300 Zeichen.'; end if;
  if hours is not null and (hours < 1 or hours > 24 * 60) then raise exception 'Ungültige Dauer.'; end if;
  if kind not in ('info', 'warn') then raise exception 'Unbekannte Art.'; end if;
  if t is null then te := null; end if;
  update public.site_state set txt = t, txt_en = te, kind = admin_set_notice.kind,
    until = case when hours is null then null else now() + make_interval(hours => hours) end, at = now() where id = 1;
  perform public.admin_note(case when t is null then 'notice_off' else 'notice' end, null, left(t, 120));
end;
$$;

-- Notschalter (z. B. bei einer Spam-Welle nach einem öffentlichen Post) und Grenze fürs automatische Ausblenden
create or replace function public.admin_set_site(signups boolean default null, guests boolean default null, auto_hide integer default null)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.site_state;
begin
  perform public.require_admin();
  if auto_hide is not null and (auto_hide < 0 or auto_hide > 20) then raise exception 'Ungültiger Wert.'; end if;
  update public.site_state set signups = coalesce(admin_set_site.signups, site_state.signups), guests = coalesce(admin_set_site.guests, site_state.guests),
    auto_hide = coalesce(admin_set_site.auto_hide, site_state.auto_hide) where id = 1 returning * into s;
  perform public.admin_note('site', null, 'Konten ' || case when s.signups then 'an' else 'aus' end || ', Gäste ' || case when s.guests then 'an' else 'aus' end
    || ', Auto-Ausblenden ' || case when s.auto_hide = 0 then 'aus' else 'ab ' || s.auto_hide end);
end;
$$;

-- neue Konten: der Notschalter gilt auch auf dem Server
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare nm text; i integer := 0; s public.site_state;
begin
  select * into s from public.site_state where id = 1;
  if coalesce(new.is_anonymous, false) then
    if s.id is not null and not s.guests then raise exception 'guests paused'; end if;
    loop
      nm := 'gast_' || lpad(floor(random() * 100000)::integer::text, 5, '0');
      exit when not exists (select 1 from public.profiles where username = nm);
      i := i + 1;
      if i > 30 then nm := 'gast_' || substr(replace(new.id::text, '-', ''), 1, 8); exit; end if;
    end loop;
    insert into public.profiles (id, username, last_seen, guest, hidden) values (new.id, nm, now(), true, true);
  else
    if s.id is not null and not s.signups then raise exception 'signups paused'; end if;
    insert into public.profiles (id, username, last_seen)
    values (new.id, lower(new.raw_user_meta_data ->> 'username'), now());
  end if;
  return new;
end;
$$;

-- Melden: wenn genug verschiedene Spieler jemanden in 24 Stunden melden, wird er ausgeblendet (Ranglisten, Suche),
-- bis sich ein Admin das ansieht. Admins und Dev-Konten sind ausgenommen.
create or replace function public.reports_auto_hide()
returns trigger language plpgsql security definer set search_path = '' as $$
declare lim integer := (select auto_hide from public.site_state where id = 1); n integer;
begin
  if coalesce(lim, 0) = 0 or public.role_of(new.target) is not null then return new; end if;
  select count(distinct r.reporter) into n from public.reports r
    where r.target = new.target and r.status = 'open' and r.created_at > now() - interval '1 day';
  if n >= lim and exists (select 1 from public.profiles p where p.id = new.target and not p.hidden and not p.dev) then
    update public.profiles set hidden = true where id = new.target;
    insert into public.admin_log (admin, admin_name, action, target, detail) values (null, 'Auto', 'auto_hide', new.target_name, n || ' Meldungen in 24 Stunden');
  end if;
  return new;
end;
$$;
revoke all on function public.reports_auto_hide() from public, anon, authenticated;
drop trigger if exists reports_auto_hide on public.reports;
create trigger reports_auto_hide after insert on public.reports for each row execute function public.reports_auto_hide();

-- ---------- 2. Verwarnungen ----------
-- txt beginnt mit '@' für eine Vorlage (@name, @abuse, @cheat, @spam), die das Spiel in der Sprache des Spielers zeigt
create table if not exists public.warnings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  txt text not null check (char_length(txt) <= 300),
  by_name text,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index if not exists warnings_user_idx on public.warnings (user_id, created_at desc);
alter table public.warnings enable row level security;   -- nur über die Funktionen unten

create or replace function public.admin_warn(name text, txt text)
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name); t text := nullif(trim(coalesce(txt, '')), '');
begin
  perform public.require_admin();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  if o = auth.uid() then raise exception 'Du kannst dich nicht selbst verwarnen.'; end if;
  perform public.check_target(o);
  if t is null then raise exception 'Schreib kurz, worum es geht.'; end if;
  if char_length(t) > 300 then raise exception 'Die Verwarnung hat höchstens 300 Zeichen.'; end if;
  insert into public.warnings (user_id, txt, by_name) values (o, t, (select username from public.profiles where id = auth.uid()));
  perform public.admin_note('warn', lower(trim(name)), left(t, 120));
end;
$$;

-- ungelesene Verwarnungen des eigenen Kontos
create or replace function public.my_warnings()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'txt', w.txt, 'at', w.created_at) order by w.created_at), '[]'::jsonb)
  from public.warnings w where w.user_id = auth.uid() and w.seen_at is null;
$$;

create or replace function public.warnings_seen()
returns void language sql security definer set search_path = '' as $$
  update public.warnings set seen_at = now() where user_id = auth.uid() and seen_at is null;
$$;
revoke all on function public.my_warnings() from public, anon;
grant execute on function public.my_warnings() to authenticated;
revoke all on function public.warnings_seen() from public, anon;
grant execute on function public.warnings_seen() to authenticated;

-- ---------- 3. Sprache ----------
alter table public.profiles add column if not exists lang text check (lang in ('de', 'en'));

create or replace function public.set_lang(l text)
returns void language sql security definer set search_path = '' as $$
  update public.profiles set lang = case when l in ('de', 'en') then l end where id = auth.uid();
$$;
revoke all on function public.set_lang(text) from public, anon;
grant execute on function public.set_lang(text) to authenticated;

-- ---------- 4. Spielerliste mit Filtern ----------
-- f: '' zuletzt aktiv, 'new' neueste Konten, 'reported' mit offenen Meldungen, 'banned', 'guest', 'hidden', 'en' englischsprachig
drop function if exists public.admin_players(text, integer);
create or replace function public.admin_players(q text default '', lim integer default 30, f text default '')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare res jsonb; ff text := coalesce(f, '');
begin
  perform public.require_admin();
  select coalesce(jsonb_agg(x.j order by x.k desc nulls last), '[]'::jsonb) into res from (
    select case when ff = 'new' then p.created_at
             when ff = 'reported' then (select max(r.created_at) from public.reports r where r.target = p.id and r.status = 'open')
             else p.last_seen end as k,
      jsonb_build_object(
      'username', p.username, 'joined', p.created_at, 'seen', p.last_seen, 'game', p.current_game,
      'hidden', p.hidden, 'dev', p.dev, 'guest', p.guest, 'lang', p.lang, 'role', public.role_of(p.id), 'me', p.id = auth.uid(),
      'renamed', p.name_changed_at,
      'note', n.note, 'ban_reason', n.ban_reason, 'note_by', n.updated_by,
      'banned_until', (select u.banned_until from auth.users u where u.id = p.id and u.banned_until > now()),
      'reports', (select count(*) from public.reports r where r.target = p.id),
      'reports_open', (select count(*) from public.reports r where r.target = p.id and r.status = 'open'),
      'warns', (select count(*) from public.warnings w where w.user_id = p.id),
      'last_warn', (select w.txt from public.warnings w where w.user_id = p.id order by w.created_at desc limit 1),
      'friends', (select count(*) from public.friendships fr where fr.status = 'accepted' and p.id in (fr.a, fr.b)),
      'online_games', (select count(*) from public.matches m where m.status = 'done' and p.id in (m.a, m.b)),
      'invited_by', (select r.username from public.profiles r where r.id = p.referred_by),
      'stats', public.stats_sum(d.data -> 'stats')) as j
    from public.profiles p
    left join public.admin_notes n on n.user_id = p.id
    left join public.user_data d on d.user_id = p.id
    where (coalesce(trim(q), '') = '' or left(p.username, char_length(trim(q))) = lower(trim(q)))
      and (ff = '' or ff = 'new'
        or (ff = 'reported' and exists (select 1 from public.reports r where r.target = p.id and r.status = 'open'))
        or (ff = 'banned' and exists (select 1 from auth.users u where u.id = p.id and u.banned_until > now()))
        or (ff = 'guest' and p.guest)
        or (ff = 'hidden' and p.hidden and not p.guest)
        or (ff = 'en' and p.lang = 'en'))
    order by 1 desc nulls last
    limit least(greatest(lim, 1), 100)) x;
  return res;
end;
$$;

-- ---------- 5. Online-Tische ----------
create or replace function public.admin_tables(st text default 'live', q text default '', lim integer default 60)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare res jsonb; o uuid := case when coalesce(trim(q), '') = '' then null else public.uid_of(q) end;
begin
  perform public.require_admin();
  if coalesce(trim(q), '') <> '' and o is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(x.j order by x.t desc), '[]'::jsonb) into res from (
    select coalesce(t.finished_at, t.started_at, t.created_at) as t, jsonb_build_object(
      'id', t.id, 'code', t.code, 'game', t.game, 'status', t.status, 'result', t.result, 'n', t.n,
      'winner', t.winner, 'moves', jsonb_array_length(t.moves),
      'seats', (select jsonb_agg(case when s.i = any (t.bots) then 'KI' else p.username end order by s.i)
        from generate_series(1, t.n) as s(i) left join public.profiles p on p.id = t.seats[s.i]),
      'online', (select jsonb_agg(coalesce(t.seen[s.i] > now() - interval '20 seconds', false) order by s.i) from generate_series(1, t.n) as s(i)),
      'created_at', t.created_at, 'started_at', t.started_at, 'finished_at', t.finished_at) as j
    from public.party_tables t
    where (st = 'all' or (st = 'live' and t.status in ('lobby', 'live')) or (st = 'done' and t.status in ('done', 'void')))
      and (o is null or o = any (t.seats))
    order by coalesce(t.finished_at, t.started_at, t.created_at) desc
    limit least(greatest(lim, 1), 200)) x;
  return res;
end;
$$;

create or replace function public.admin_void_table(tid uuid, why text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.party_tables;
begin
  perform public.require_admin();
  select * into t from public.party_tables where id = tid;
  if t.id is null then raise exception 'Tisch nicht gefunden.'; end if;
  update public.party_tables set status = 'void', result = left('admin: ' || coalesce(nullif(trim(why), ''), 'annulliert'), 120),
    finished_at = coalesce(finished_at, now()) where id = tid;
  perform public.admin_note('void_table', t.code, t.game || coalesce(': ' || nullif(trim(why), ''), ''));
end;
$$;

-- ---------- 6. Übersicht ----------
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare games jsonb; tot integer;
begin
  perform public.require_admin();
  select coalesce(jsonb_object_agg(k, n), '{}'::jsonb), coalesce(sum(n), 0) into games, tot from (
    select e.key as k, sum(public.jint(e.value))::integer as n
    from public.user_data d
    cross join lateral jsonb_each(public.stats_sum(d.data -> 'stats') -> 'per') e
    where not public.is_dev(d.user_id)
    group by e.key) g;
  return jsonb_build_object(
    'players', (select count(*) from public.profiles where not dev and not guest),
    'guests', (select count(*) from public.profiles where guest),
    'new7', (select count(*) from public.profiles where created_at > now() - interval '7 days' and not dev and not guest),
    'online', (select count(*) from public.profiles where last_seen > now() - interval '2 minutes' and not dev),
    'active1', (select count(*) from public.profiles where last_seen > now() - interval '1 day' and not dev),
    'active7', (select count(*) from public.profiles where last_seen > now() - interval '7 days' and not dev),
    'matches', tot,
    'games', games,
    'live_matches', (select count(*) from public.matches where status = 'live'),
    'live_tables', (select count(*) from public.party_tables where status = 'live'),
    'online_matches', (select count(*) from public.matches where status = 'done'),
    'online_matches1', (select count(*) from public.matches where status = 'done' and finished_at > now() - interval '1 day'),
    'friendships', (select count(*) from public.friendships where status = 'accepted'),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'hidden', (select count(*) from public.profiles where hidden and not dev and not guest),
    'banned', (select count(*) from auth.users where banned_until > now()),
    'langs', (select coalesce(jsonb_object_agg(l, n), '{}'::jsonb) from (
        select coalesce(lang, '?') as l, count(*) as n from public.profiles
        where not dev and last_seen > now() - interval '30 days' group by 1) x),
    'site', (select to_jsonb(s) - 'id' from public.site_state s where s.id = 1),
    -- letzte 14 Tage: neue Konten (ohne Gäste) und beendete Online-Partien (Duelle und Tische)
    'days', (select jsonb_agg(jsonb_build_object('d', d.day,
        'new', (select count(*) from public.profiles p where p.created_at >= d.day and p.created_at < d.day + 1 and not p.dev and not p.guest),
        'games', (select count(*) from public.matches m where m.status = 'done' and m.finished_at >= d.day and m.finished_at < d.day + 1)
          + (select count(*) from public.party_tables t where t.status = 'done' and t.finished_at >= d.day and t.finished_at < d.day + 1))
        order by d.day)
      from (select (current_date - g)::date as day from generate_series(0, 13) g) d),
    'team', (select coalesce(jsonb_agg(jsonb_build_object('username', p.username, 'role', a.role, 'since', a.created_at)
        order by a.role = 'owner' desc, p.username), '[]'::jsonb)
      from public.admins a join public.profiles p on p.id = a.user_id),
    'recent', (select coalesce(jsonb_agg(r.j order by r.t desc), '[]'::jsonb) from (
        select p.created_at as t, jsonb_build_object('username', p.username, 'joined', p.created_at, 'lang', p.lang) as j
        from public.profiles p where not p.dev and not p.guest order by p.created_at desc limit 8) r)
  );
end;
$$;

-- ---------- 7. Gastkonten aufräumen ----------
-- Gäste, die seit `days` Tagen nicht da waren. dry = true zählt nur.
create or replace function public.admin_purge_guests(days integer default 30, dry boolean default true)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  perform public.require_owner();
  if days is null or days < 7 then raise exception 'Mindestens 7 Tage.'; end if;
  if dry then
    select count(*) into n from public.profiles p
      where p.guest and coalesce(p.last_seen, p.created_at) < now() - make_interval(days => days) and public.role_of(p.id) is null;
    return n;
  end if;
  with gone as (
    delete from auth.users u using public.profiles p
    where p.id = u.id and p.guest and coalesce(p.last_seen, p.created_at) < now() - make_interval(days => days) and public.role_of(p.id) is null
    returning u.id)
  select count(*) into n from gone;
  perform public.admin_note('purge_guests', null, n || ' Gäste, älter als ' || days || ' Tage');
  return n;
end;
$$;

-- ---------- Rechte ----------
do $$
declare f text;
begin
  foreach f in array array[
    'admin_set_notice(text, text, integer, text)', 'admin_set_site(boolean, boolean, integer)', 'admin_warn(text, text)',
    'admin_players(text, integer, text)', 'admin_tables(text, text, integer)', 'admin_void_table(uuid, text)',
    'admin_stats()', 'admin_purge_guests(integer, boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
