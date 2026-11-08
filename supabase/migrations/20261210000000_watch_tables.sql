-- Zuschauen an Tischen: Freunde (und Admins) schauen einem laufenden Tisch zu, nur lesend.
-- Nur bei Tisch-Spielen ohne geheime Karten oder Wörter, die man von außen sehen könnte:
-- Ludo, Leiterspiel, Würfelpoker (yacht), Memory und Galgenmännchen.
-- Im SQL-Editor ausführen. Ohne die Migration zeigt die App beim Freund am Tisch einfach keinen "Zuschauen"-Knopf.

create or replace function public.party_watchable(gm text)
returns boolean language sql immutable set search_path = '' as $$
  select gm in ('ludo', 'ladder', 'yacht', 'memory', 'hangman');
$$;
grant execute on function public.party_watchable(text) to authenticated;

-- Darf u diesem Tisch zuschauen? Nicht selbst am Tisch, und Admin oder Freund von jemandem, der dort sitzt
-- (der Freund versteckt seinen Online-Status nicht, und niemand am Tisch hat u blockiert)
create or replace function public.party_can_watch(t public.party_tables, u uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select u is not null and public.party_seat(t, u) = 0 and (
    public.role_of(u) is not null
    or (public.party_watchable(t.game) and exists (
      select 1 from public.friendships f join public.profiles p on p.id = case when f.requester = u then f.addressee else f.requester end
      where f.status = 'accepted' and (f.requester = u or f.addressee = u)
        and p.id = any (t.seats) and not p.stealth)
      and not exists (select 1 from unnest(t.seats) x where x is not null and public.blocked_between(u, x))));
$$;
revoke all on function public.party_can_watch(public.party_tables, uuid) from public, anon, authenticated;

-- Stand eines Tisches: wie bisher, dazu Zuschauer (Freunde), die nur lesen
create or replace function public.party_state(tid uuid, since integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); t public.party_tables; s integer;
begin
  select * into t from public.party_tables where id = tid;
  if t.id is null then raise exception 'Diesen Tisch gibt es nicht.'; end if;
  s := public.party_seat(t, u);
  if s = 0 and not public.party_can_watch(t, u) then raise exception 'Du sitzt nicht an diesem Tisch.'; end if;
  if s > 0 and t.status in ('lobby', 'live') and not (s::smallint = any(t.bots)) then
    update public.party_tables set seen[s] = now() where id = tid;
  end if;
  perform public.party_sweep();
  select * into t from public.party_tables where id = tid;
  return public.party_view(t, since, u);
end;
$$;
revoke all on function public.party_state(uuid, integer) from public, anon;
grant execute on function public.party_state(uuid, integer) to authenticated;

-- Freundesliste: wie bisher, dazu der laufende Tisch eines Freundes (wenn man zuschauen kann)
create or replace function public.friends()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  return jsonb_build_object(
    'friends', (select coalesce(jsonb_agg(x.j order by x.o desc, x.n), '[]'::jsonb) from (
      select p.username as n, (not p.stealth and p.last_seen > now() - interval '2 minutes') as o,
        jsonb_build_object(
          'username', p.username,
          'online', not p.stealth and p.last_seen > now() - interval '2 minutes',
          'seen', case when p.stealth then null else p.last_seen end,
          'game', case when p.stealth then null else p.current_game end,
          'busy', not p.stealth and lm.id is not null,
          'match', case when p.stealth then null else lm.id end,
          'match_game', case when p.stealth then null else lm.game end,
          'match_opp', case when p.stealth or lm.id is null then null
            else (select username from public.profiles where id = case when lm.a = p.id then lm.b else lm.a end) end,
          'watchable', not p.stealth and lm.id is not null and lm.game <> 'ships' and lm.a_side is not null,
          'table', case when p.stealth or lt.id is null or not public.party_can_watch(lt, u) then null else lt.id end,
          'table_game', case when p.stealth or lt.id is null then null else lt.game end) as j
      from public.friendships f
      join public.profiles p on p.id = case when f.requester = u then f.addressee else f.requester end
      left join lateral (select m.* from public.matches m where m.status = 'live' and (m.a = p.id or m.b = p.id) limit 1) lm on true
      left join lateral (select t.* from public.party_tables t where t.status = 'live' and p.id = any (t.seats)
        and not (public.party_seat(t, p.id)::smallint = any (t.bots)) limit 1) lt on true
      where f.status = 'accepted' and (f.requester = u or f.addressee = u)) x),
    'incoming', (select coalesce(jsonb_agg(p.username order by f.created_at), '[]'::jsonb)
      from public.friendships f join public.profiles p on p.id = f.requester where f.addressee = u and f.status = 'pending'),
    'outgoing', (select coalesce(jsonb_agg(p.username order by f.created_at), '[]'::jsonb)
      from public.friendships f join public.profiles p on p.id = f.addressee where f.requester = u and f.status = 'pending'));
end;
$$;
revoke all on function public.friends() from public, anon;
grant execute on function public.friends() to authenticated;
