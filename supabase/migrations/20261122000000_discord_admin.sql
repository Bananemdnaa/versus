-- Versus: Discord-Spieler im Admin-Panel
-- 1. profiles.discord_first / discord_at: wann jemand die Discord-Aktivität zuerst und zuletzt genutzt hat (Gäste und Konten);
--    die App ruft mark_discord() einmal pro Start in der Aktivität auf
-- 2. admin_discord(): Zahlen für die Übersicht (Spieler gesamt, heute, 7 Tage, Räume der letzten 24 Std., letzte Spieler)
-- 3. admin_players: Feld "discord" und Filter 'discord'

alter table public.profiles add column if not exists discord_first timestamptz;
alter table public.profiles add column if not exists discord_at timestamptz;
create index if not exists profiles_discord_idx on public.profiles (discord_at desc) where discord_at is not null;

create or replace function public.mark_discord()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set discord_at = now(), discord_first = coalesce(discord_first, now()) where id = auth.uid();
$$;
revoke all on function public.mark_discord() from public, anon;
grant execute on function public.mark_discord() to authenticated;

create or replace function public.admin_discord()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'total', (select count(*) from public.profiles where discord_first is not null),
    'guests', (select count(*) from public.profiles where discord_first is not null and guest),
    'active1', (select count(*) from public.profiles where discord_at > now() - interval '1 day'),
    'active7', (select count(*) from public.profiles where discord_at > now() - interval '7 days'),
    'new7', (select count(*) from public.profiles where discord_first > now() - interval '7 days'),
    'rooms1', (select count(*) from public.discord_rooms where at > now() - interval '1 day'),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('username', x.username, 'at', x.discord_at, 'guest', x.guest) order by x.discord_at desc)
      from (select username, discord_at, guest from public.profiles where discord_at is not null order by discord_at desc limit 8) x), '[]'::jsonb));
end;
$$;
revoke all on function public.admin_discord() from public, anon;
grant execute on function public.admin_discord() to authenticated;

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
             when ff = 'discord' then p.discord_at
             else p.last_seen end as k,
      jsonb_build_object(
      'username', p.username, 'joined', p.created_at, 'seen', p.last_seen, 'game', p.current_game,
      'hidden', p.hidden, 'dev', p.dev, 'guest', p.guest, 'lang', p.lang, 'role', public.role_of(p.id), 'me', p.id = auth.uid(),
      'renamed', p.name_changed_at, 'discord', p.discord_at,
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
        or (ff = 'noted' and coalesce(trim(n.note), '') <> '')
        or (ff = 'discord' and p.discord_at is not null))
    order by 1 desc nulls last
    limit least(greatest(lim, 1), 100)) x;
  return res;
end;
$$;
revoke all on function public.admin_players(text, integer, text) from public, anon;
grant execute on function public.admin_players(text, integer, text) to authenticated;
