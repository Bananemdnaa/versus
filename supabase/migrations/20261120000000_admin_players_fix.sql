-- Versus: Spielerliste im Admin-Panel repariert und mehr Infos für Spieler, die man nicht persönlich kennt
-- 1. Fehler: admin_players zählte Freunde über friendships.a/b, die Spalten heißen requester/addressee
--    ("column does not exist" → im Panel "Der Server ist noch nicht fertig eingerichtet")
-- 2. Frühere Namen: jede Umbenennung (selbst oder durch das Team) landet in name_history;
--    die Suche findet Spieler auch unter einem alten Namen
-- 3. Pro Spieler: Online-Siege/-Niederlagen, verlassene Partien, selbst abgeschickte Meldungen
-- 4. Neue Filter: 'warned' verwarnt, 'noted' mit Team-Notiz (als Beobachtungsliste)

-- ---------- 2. Frühere Namen ----------
create table if not exists public.name_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  old_name text not null,
  new_name text not null,
  created_at timestamptz not null default now()
);
create index if not exists name_history_user_idx on public.name_history (user_id, created_at desc);
create index if not exists name_history_old_idx on public.name_history (old_name);
alter table public.name_history enable row level security;   -- nur über die Funktionen unten

create or replace function public.rename_user_internal(o uuid, new_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare nn text := lower(trim(coalesce(new_name, ''))); mail text; old text;
begin
  if nn !~ '^[a-z0-9_-]{3,16}$' then raise exception 'Benutzername: 3 bis 16 Zeichen, nur a–z, 0–9, _ und -.'; end if;
  if public.bad_name(nn) then raise exception 'Dieser Benutzername ist nicht erlaubt.'; end if;
  if exists (select 1 from public.profiles where username = nn and id <> o) then raise exception 'Diesen Benutzernamen gibt es schon.'; end if;
  select username into old from public.profiles where id = o;
  if old is not null and old <> nn then
    insert into public.name_history (user_id, old_name, new_name) values (o, old, nn);
  end if;
  mail := nn || '@bananemdnaa.github.io';
  update public.profiles set username = nn, name_changed_at = now() where id = o;
  update auth.users set email = mail,
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('username', nn)
    where id = o;
  update auth.identities set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object('email', mail)
    where user_id = o and provider = 'email';
  return nn;
end;
$$;
revoke all on function public.rename_user_internal(uuid, text) from public, anon, authenticated;

-- ---------- 1, 3, 4. Spielerliste ----------
-- f: '' zuletzt aktiv, 'new', 'reported', 'banned', 'guest', 'hidden', 'en', 'warned', 'noted'
create or replace function public.admin_players(q text default '', lim integer default 30, f text default '')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare res jsonb; ff text := coalesce(f, ''); qq text := lower(trim(coalesce(q, '')));
begin
  perform public.require_admin();
  select coalesce(jsonb_agg(x.j order by x.k desc nulls last), '[]'::jsonb) into res from (
    select case when ff = 'new' then p.created_at
             when ff = 'reported' then (select max(r.created_at) from public.reports r where r.target = p.id and r.status = 'open')
             when ff = 'warned' then (select max(w.created_at) from public.warnings w where w.user_id = p.id)
             when ff = 'noted' then n.updated_at
             else p.last_seen end as k,
      jsonb_build_object(
      'username', p.username, 'joined', p.created_at, 'seen', p.last_seen, 'game', p.current_game,
      'hidden', p.hidden, 'dev', p.dev, 'guest', p.guest, 'lang', p.lang, 'role', public.role_of(p.id), 'me', p.id = auth.uid(),
      'renamed', p.name_changed_at,
      'old_names', (select jsonb_agg(h.old_name order by h.created_at desc) from public.name_history h where h.user_id = p.id),
      'note', n.note, 'ban_reason', n.ban_reason, 'note_by', n.updated_by,
      'banned_until', (select u.banned_until from auth.users u where u.id = p.id and u.banned_until > now()),
      'reports', (select count(*) from public.reports r where r.target = p.id),
      'reports_open', (select count(*) from public.reports r where r.target = p.id and r.status = 'open'),
      'reports_made', (select count(*) from public.reports r where r.reporter = p.id),
      'warns', (select count(*) from public.warnings w where w.user_id = p.id),
      'last_warn', (select w.txt from public.warnings w where w.user_id = p.id order by w.created_at desc limit 1),
      'friends', (select count(*) from public.friendships fr where fr.status = 'accepted' and p.id in (fr.requester, fr.addressee)),
      'online_games', (select count(*) from public.matches m where m.status = 'done' and p.id in (m.a, m.b)),
      'online_wins', (select count(*) from public.matches m where m.status = 'done' and m.winner = p.id),
      'online_losses', (select count(*) from public.matches m where m.status = 'done' and p.id in (m.a, m.b) and m.winner is not null and m.winner <> p.id),
      'online_quits', (select count(*) from public.matches m where m.status = 'done' and m.result = 'abandon' and p.id in (m.a, m.b) and m.winner is not null and m.winner <> p.id),
      'invited_by', (select r.username from public.profiles r where r.id = p.referred_by),
      'stats', public.stats_sum(d.data -> 'stats')) as j
    from public.profiles p
    left join public.admin_notes n on n.user_id = p.id
    left join public.user_data d on d.user_id = p.id
    where (qq = '' or left(p.username, char_length(qq)) = qq
        or exists (select 1 from public.name_history h where h.user_id = p.id and left(h.old_name, char_length(qq)) = qq))
      and (ff = '' or ff = 'new'
        or (ff = 'reported' and exists (select 1 from public.reports r where r.target = p.id and r.status = 'open'))
        or (ff = 'banned' and exists (select 1 from auth.users u where u.id = p.id and u.banned_until > now()))
        or (ff = 'guest' and p.guest)
        or (ff = 'hidden' and p.hidden and not p.guest)
        or (ff = 'en' and p.lang = 'en')
        or (ff = 'warned' and exists (select 1 from public.warnings w where w.user_id = p.id))
        or (ff = 'noted' and coalesce(trim(n.note), '') <> ''))
    order by 1 desc nulls last
    limit least(greatest(lim, 1), 100)) x;
  return res;
end;
$$;
revoke all on function public.admin_players(text, integer, text) from public, anon;
grant execute on function public.admin_players(text, integer, text) to authenticated;
