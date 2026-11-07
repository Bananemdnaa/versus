-- Team-Werkzeuge: Moderator-Rolle, Spiele einzeln in Wartung, Mindestversion, Feedback beantworten,
-- Meldungen übernehmen, Protokoll filtern, Elo zurücksetzen, KI ersetzt einen Spieler am Tisch.

-- ---------- 1. Moderator-Rolle ----------
-- Moderatoren sehen alles im Admin-Panel und kümmern sich um Meldungen, Feedback und Verwarnungen.
-- Sie dürfen ausblenden und bis zu 7 Tage sperren. Seite, Umfragen, Umbenennen, Bilanz/Elo, Annullieren
-- und dauerhafte Sperren bleiben bei Admins und dem Owner.
alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins add constraint admins_role_check check (role in ('owner', 'admin', 'mod'));

-- Admin oder Owner (nicht Moderator)
create or replace function public.require_full()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null or public.role_of(u) is null then raise exception 'Keine Admin-Rechte.'; end if;
  if public.role_of(u) = 'mod' then raise exception 'Das dürfen nur Admins.'; end if;
  return u;
end;
$$;
revoke all on function public.require_full() from public, anon, authenticated;

-- Owner darf alle bearbeiten, Admins normale Spieler, Moderatoren und sich selbst, Moderatoren nur normale Spieler und sich selbst
create or replace function public.check_target(o uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
declare me text := public.role_of(auth.uid()); them text := public.role_of(o);
begin
  if them is null or o = auth.uid() or me = 'owner' or (me = 'admin' and them = 'mod') then return; end if;
  raise exception 'Teammitglieder kann nur jemand mit mehr Rechten bearbeiten.';
end;
$$;
revoke all on function public.check_target(uuid) from public, anon, authenticated;

-- Funktionen nur für Admins: in der jeweils neuesten Fassung require_admin() gegen require_full() tauschen
do $$
declare f text; r record; d text; hit integer;
begin
  foreach f in array array['admin_set_site', 'admin_set_notice', 'admin_set_season', 'admin_rename_user', 'admin_reset_stats',
    'admin_clear_motto', 'admin_clear_awards', 'admin_void_match', 'admin_void_table',
    'admin_survey_save', 'admin_survey_delete', 'admin_survey_status'] loop
    hit := 0;
    for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = f loop
      d := pg_get_functiondef(r.oid);
      if position('public.require_admin()' in d) = 0 then raise exception '% ruft require_admin() nicht auf', f; end if;
      execute replace(d, 'public.require_admin()', 'public.require_full()');
      hit := hit + 1;
    end loop;
    if hit = 0 then raise exception 'Funktion % fehlt', f; end if;
  end loop;
end $$;

-- Sperren: Moderatoren nur 1 bis 7 Tage; Entsperren nur, wenn die Sperre höchstens noch 7 Tage läuft
do $$
declare d text; o oid;
begin
  select p.oid into o from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'admin_ban';
  d := pg_get_functiondef(o);
  if position('perform public.require_admin();' in d) = 0 then raise exception 'admin_ban: Stelle nicht gefunden'; end if;
  execute replace(d, 'perform public.require_admin();', 'perform public.require_admin();
  if public.role_of(auth.uid()) = ''mod'' and (days is null or days > 7) then raise exception ''Moderatoren sperren höchstens 7 Tage.''; end if;');
  select p.oid into o from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'admin_unban';
  d := pg_get_functiondef(o);
  if position('perform public.check_target(o);' in d) = 0 then raise exception 'admin_unban: Stelle nicht gefunden'; end if;
  execute replace(d, 'perform public.check_target(o);', 'perform public.check_target(o);
  if public.role_of(auth.uid()) = ''mod'' and (select u.banned_until > now() + interval ''8 days'' from auth.users u where u.id = o) then
    raise exception ''Lange Sperren heben nur Admins auf.''; end if;');
end $$;

-- Rolle vergeben: Owner alles (Admin, Moderator, keine), Admins nur Moderator an und aus
create or replace function public.admin_set_role(name text, r text)
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name); me text; old text; nr text := nullif(trim(coalesce(r, '')), '');
begin
  perform public.require_full();
  me := public.role_of(auth.uid());
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  if o = auth.uid() then raise exception 'Deine eigene Rolle kannst du nicht ändern.'; end if;
  if nr is not null and nr not in ('admin', 'mod') then raise exception 'Unbekannte Rolle.'; end if;
  old := public.role_of(o);
  if old = 'owner' then raise exception 'Die Owner-Rolle lässt sich hier nicht ändern.'; end if;
  if me <> 'owner' and (nr = 'admin' or old = 'admin') then raise exception 'Admins ernennt und entlässt nur der Owner.'; end if;
  if old is not distinct from nr then return; end if;
  if nr is null then delete from public.admins where user_id = o;
  else insert into public.admins (user_id, role) values (o, nr) on conflict (user_id) do update set role = excluded.role;
  end if;
  perform public.admin_note(case nr when 'admin' then 'admin_on' when 'mod' then 'mod_on' else case old when 'mod' then 'mod_off' else 'admin_off' end end,
    lower(trim(name)), null);
end;
$$;
revoke all on function public.admin_set_role(text, text) from public, anon;
grant execute on function public.admin_set_role(text, text) to authenticated;

-- ---------- 2. Spiele einzeln in Wartung, 3. Mindestversion ----------
-- games: {"chess": "online"} = nur online pausiert, {"chess": "off"} = ganz pausiert
alter table public.site_state add column if not exists games jsonb not null default '{}'::jsonb;
alter table public.site_state add column if not exists min_v integer not null default 0;

create or replace function public.site_notice()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'txt', case when s.until is null or s.until > now() then s.txt end,
    'txt_en', case when s.until is null or s.until > now() then s.txt_en end,
    'kind', s.kind, 'until', s.until, 'at', s.at, 'signups', s.signups, 'guests', s.guests, 'season', s.season,
    'games', s.games, 'min_v', s.min_v)
  from public.site_state s where s.id = 1;
$$;

create or replace function public.admin_set_game(g text, mode text)
returns void language plpgsql security definer set search_path = '' as $$
declare m text := coalesce(mode, '');
begin
  perform public.require_full();
  if g is null or g !~ '^[a-z0-9_]{1,20}$' then raise exception 'Unbekanntes Spiel.'; end if;
  if m not in ('', 'online', 'off') then raise exception 'Unbekannter Zustand.'; end if;
  update public.site_state set games = case when m = '' then games - g else games || jsonb_build_object(g, m) end where id = 1;
  perform public.admin_note('game', null, g || ': ' || case m when '' then 'an' when 'online' then 'online pausiert' else 'pausiert' end);
end;
$$;
revoke all on function public.admin_set_game(text, text) from public, anon;
grant execute on function public.admin_set_game(text, text) to authenticated;

create or replace function public.admin_set_min_version(v integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_full();
  if v is null or v < 0 or v > 100000 then raise exception 'Ungültige Version.'; end if;
  update public.site_state set min_v = v where id = 1;
  perform public.admin_note('min_version', null, case when v = 0 then 'aus' else 'ab ' || v end);
end;
$$;
revoke all on function public.admin_set_min_version(integer) from public, anon;
grant execute on function public.admin_set_min_version(integer) to authenticated;

-- neue Online-Partien und Tische eines pausierten Spiels lehnt der Server ab (laufende spielen zu Ende)
create or replace function public.game_paused_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.site_state s where s.id = 1 and s.games ? new.game) then
    raise exception 'Dieses Spiel ist gerade in Wartung. Versuch es später nochmal.';
  end if;
  return new;
end;
$$;
revoke all on function public.game_paused_guard() from public, anon, authenticated;
drop trigger if exists matches_game_paused on public.matches;
create trigger matches_game_paused before insert on public.matches for each row execute function public.game_paused_guard();
drop trigger if exists party_tables_game_paused on public.party_tables;
create trigger party_tables_game_paused before insert on public.party_tables for each row execute function public.game_paused_guard();

-- ---------- 4. Feedback beantworten ----------
-- Die Antwort kommt als Nachricht vom Team beim nächsten Öffnen (wie eine Verwarnung, aber freundlich)
alter table public.warnings add column if not exists kind text not null default 'warn' check (kind in ('warn', 'reply'));
alter table public.warnings add column if not exists ref text check (char_length(ref) <= 200);
alter table public.feedback add column if not exists reply text check (char_length(reply) <= 500);
alter table public.feedback add column if not exists reply_by text;
alter table public.feedback add column if not exists reply_at timestamptz;
alter table public.warnings drop constraint if exists warnings_txt_check;
alter table public.warnings add constraint warnings_txt_check check (char_length(txt) <= 500);

create or replace function public.my_warnings()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'txt', w.txt, 'at', w.created_at, 'kind', w.kind, 'ref', w.ref, 'by', w.by_name) order by w.created_at), '[]'::jsonb)
  from public.warnings w where w.user_id = auth.uid() and w.seen_at is null;
$$;

create or replace function public.admin_feedback_reply(fid bigint, txt text)
returns void language plpgsql security definer set search_path = '' as $$
declare f public.feedback; t text := nullif(trim(coalesce(txt, '')), ''); me text;
begin
  perform public.require_admin();
  select * into f from public.feedback where id = fid;
  if f.id is null then raise exception 'Feedback nicht gefunden.'; end if;
  if f.user_id is null then raise exception 'Ohne Konto kann die Antwort niemanden erreichen.'; end if;
  if t is null then raise exception 'Schreib eine Antwort.'; end if;
  if char_length(t) > 500 then raise exception 'Die Antwort hat höchstens 500 Zeichen.'; end if;
  me := (select username from public.profiles where id = auth.uid());
  insert into public.warnings (user_id, txt, by_name, kind, ref) values (f.user_id, t, me, 'reply', left(f.txt, 200));
  update public.feedback set reply = t, reply_by = me, reply_at = now(), status = 'done', handled_by = coalesce(handled_by, me) where id = fid;
  perform public.admin_note('fb_reply', coalesce((select username from public.profiles where id = f.user_id), f.username), left(t, 120));
end;
$$;
revoke all on function public.admin_feedback_reply(bigint, text) from public, anon;
grant execute on function public.admin_feedback_reply(bigint, text) to authenticated;

-- ---------- 5. Meldungen, Feedback und Dev-Bugs übernehmen ----------
alter table public.reports add column if not exists claimed_by text;
alter table public.feedback add column if not exists claimed_by text;
alter table public.dev_reports add column if not exists claimed_by text;

create or replace function public.admin_claim(kind text, rid bigint, take boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare me text; v text;
begin
  perform public.require_admin();
  me := (select username from public.profiles where id = auth.uid());
  v := case when take then me end;
  if kind = 'report' then update public.reports set claimed_by = v where id = rid and (take or claimed_by = me or public.role_of(auth.uid()) <> 'mod');
  elsif kind = 'feedback' then update public.feedback set claimed_by = v where id = rid and (take or claimed_by = me or public.role_of(auth.uid()) <> 'mod');
  elsif kind = 'devbug' then update public.dev_reports set claimed_by = v where id = rid and (take or claimed_by = me or public.role_of(auth.uid()) <> 'mod');
  else raise exception 'Unbekannte Art.';
  end if;
end;
$$;
revoke all on function public.admin_claim(text, bigint, boolean) from public, anon;
grant execute on function public.admin_claim(text, bigint, boolean) to authenticated;

-- die Listen zeigen, wer etwas übernommen hat (und beim Feedback die Antwort)
do $$
declare d text; o oid;
begin
  select p.oid into o from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'admin_reports';
  d := pg_get_functiondef(o);
  if position('''by'', r.handled_by,' in d) = 0 then raise exception 'admin_reports: Stelle nicht gefunden'; end if;
  execute replace(d, '''by'', r.handled_by,', '''by'', r.handled_by, ''claim'', r.claimed_by,');

  select p.oid into o from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'admin_feedback';
  d := pg_get_functiondef(o);
  if position('''by'', f.handled_by,' in d) = 0 then raise exception 'admin_feedback: Stelle nicht gefunden'; end if;
  execute replace(d, '''by'', f.handled_by,', '''by'', f.handled_by, ''claim'', f.claimed_by, ''reply'', f.reply, ''reply_by'', f.reply_by, ''reply_at'', f.reply_at, ''uid'', f.user_id is not null,');

  select p.oid into o from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'dev_reports';
  d := pg_get_functiondef(o);
  if position('''by'', r.done_by)' in d) = 0 then raise exception 'dev_reports: Stelle nicht gefunden'; end if;
  execute replace(d, '''by'', r.done_by)', '''by'', r.done_by, ''claim'', r.claimed_by)');
end $$;

-- ---------- 6. Protokoll filtern ----------
drop function if exists public.admin_log_list(integer);
create or replace function public.admin_log_list(lim integer default 80, who text default '', tgt text default '', act text default '')
returns table (id bigint, admin_name text, action text, target text, detail text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare w text := lower(trim(coalesce(who, ''))); t text := lower(trim(coalesce(tgt, ''))); a text := coalesce(act, '');
begin
  perform public.require_admin();
  return query select l.id, l.admin_name, l.action, l.target, l.detail, l.created_at
    from public.admin_log l
    where (w = '' or l.admin_name = w)
      and (t = '' or l.target like t || '%')
      and (a = '' or (a = 'mod' and l.action in ('ban', 'unban', 'warn', 'hide', 'show', 'auto_hide', 'report_done', 'report_open'))
        or (a = 'team' and l.action in ('admin_on', 'admin_off', 'mod_on', 'mod_off', 'dev_on', 'dev_off'))
        or (a = 'site' and l.action in ('notice', 'notice_off', 'site', 'season', 'game', 'min_version', 'purge_guests', 'survey'))
        or (a = 'play' and l.action in ('void_match', 'void_table', 'seat_ai', 'elo_reset', 'reset_stats'))
        or l.action = a)
    order by l.created_at desc limit least(greatest(lim, 1), 200);
end;
$$;
revoke all on function public.admin_log_list(integer, text, text, text) from public, anon;
grant execute on function public.admin_log_list(integer, text, text, text) to authenticated;

-- ---------- 7. Elo ansehen und zurücksetzen ----------
create or replace function public.admin_elo(name text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare o uuid := public.uid_of(name);
begin
  perform public.require_admin();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('game', r.game, 'elo', r.elo, 'peak', r.peak, 'games', r.games) order by r.games desc), '[]'::jsonb)
    from public.ratings r where r.uid = o);
end;
$$;
revoke all on function public.admin_elo(text) from public, anon;
grant execute on function public.admin_elo(text) to authenticated;

-- g leer: alle Spiele. Der Spieler fängt wieder bei 1000 an.
create or replace function public.admin_elo_reset(name text, g text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name); n integer;
begin
  perform public.require_full();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  perform public.check_target(o);
  delete from public.ratings where uid = o and (coalesce(g, '') = '' or game = g);
  get diagnostics n = row_count;
  perform public.admin_note('elo_reset', lower(trim(name)), case when coalesce(g, '') = '' then 'alle Spiele' else g end || ' (' || n || ')');
end;
$$;
revoke all on function public.admin_elo_reset(text, text) from public, anon;
grant execute on function public.admin_elo_reset(text, text) to authenticated;

-- ---------- 8. KI übernimmt einen Platz am laufenden Tisch ----------
-- wie party_leave: der Platz wird zur KI, war es der Gastgeber, übernimmt der nächste Mensch
create or replace function public.admin_seat_ai(tid uuid, s integer)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.party_tables; h integer[]; nm text;
begin
  perform public.require_full();
  select * into t from public.party_tables where id = tid for update;
  if t.id is null then raise exception 'Tisch nicht gefunden.'; end if;
  if t.status <> 'live' then raise exception 'Der Tisch läuft nicht.'; end if;
  if s is null or s < 1 or s > t.n or t.seats[s] is null or s::smallint = any(t.bots) then raise exception 'Auf diesem Platz sitzt kein Mensch.'; end if;
  nm := (select username from public.profiles where id = t.seats[s]);
  t.bots := t.bots || s::smallint;
  h := public.party_humans(t);
  if cardinality(h) = 0 then
    update public.party_tables set bots = t.bots, status = 'void', result = 'abandon', finished_at = now() where id = tid;
  else
    update public.party_tables set bots = t.bots, host = case when host = s then h[1] else host end where id = tid;
  end if;
  perform public.admin_note('seat_ai', nm, 'Tisch ' || t.code);
end;
$$;
revoke all on function public.admin_seat_ai(uuid, integer) from public, anon;
grant execute on function public.admin_seat_ai(uuid, integer) to authenticated;

-- admin_tables liefert die Tisch-ID schon; die Platznummer ist die Stelle in "seats"
