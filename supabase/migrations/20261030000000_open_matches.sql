-- Versus: offene Herausforderungen. Wer eine Partie ohne Gegner startet, wird allen eingeloggten Spielern angezeigt;
-- wer zuerst beitritt, spielt. Einmal im Supabase SQL-Editor ausführen. Baut auf 20261029000000_friends_matches.sql auf.

alter table public.matches alter column b drop not null;

-- opp leer = offene Herausforderung für alle
create or replace function public.match_invite(opp text, gm text, op jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := null; mid uuid;
begin
  perform public.match_sweep();
  if gm not in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots') then raise exception 'Dieses Spiel gibt es online noch nicht.'; end if;
  if op is null or jsonb_typeof(op) <> 'object' or octet_length(op::text) > 500 then op := '{}'::jsonb; end if;
  if coalesce(trim(opp), '') <> '' then
    o := public.uid_of(opp);
    if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
    if o = u then raise exception 'Du kannst dich nicht selbst einladen.'; end if;
    if not public.are_friends(u, o) then raise exception 'Du kannst nur Freunde direkt einladen.'; end if;
    if exists (select 1 from public.matches where status = 'live' and (a = o or b = o)) then
      raise exception 'Dein Freund spielt gerade eine andere Partie.';
    end if;
  end if;
  if exists (select 1 from public.matches where status in ('invited', 'live') and (a = u or b = u)) then
    raise exception 'Du bist schon in einer Partie oder wartest auf eine Antwort.';
  end if;
  insert into public.matches (game, opts, a, b) values (gm, op, u, o) returning id into mid;
  return mid;
end;
$$;

-- Einer offenen Herausforderung beitreten
create or replace function public.match_join(mid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches;
begin
  perform public.match_sweep();
  if exists (select 1 from public.matches where status = 'live' and (a = u or b = u)) then
    raise exception 'Beende erst deine laufende Partie.';
  end if;
  update public.matches set b = u, status = 'live', started_at = now(), b_seen = now(),
    a_side = case when random() < 0.5 then 1 else 2 end
    where id = mid and b is null and status = 'invited' and a <> u
    returning * into m;
  if m.id is null then raise exception 'Da war jemand schneller, oder die Herausforderung gilt nicht mehr.'; end if;
  -- eigene offene Herausforderung und Einladungen an mich sind damit erledigt
  update public.matches set status = 'canceled', finished_at = now() where a = u and status = 'invited';
  update public.matches set status = 'declined', finished_at = now() where b = u and status = 'invited' and id <> mid;
  return public.match_view(m, 0, u);
end;
$$;

-- Menü: zusätzlich offene Herausforderungen anderer Spieler
create or replace function public.my_pending()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  perform public.match_sweep();
  return jsonb_build_object(
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', p.username, 'game', m.game, 'opts', m.opts, 'at', m.created_at) order by m.created_at desc), '[]'::jsonb)
      from public.matches m join public.profiles p on p.id = m.a where m.b = u and m.status = 'invited'),
    'open', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', p.username, 'game', m.game, 'opts', m.opts, 'at', m.created_at) order by m.created_at desc), '[]'::jsonb)
      from public.matches m join public.profiles p on p.id = m.a
      where m.b is null and m.status = 'invited' and m.a <> u and not p.dev and not p.hidden),
    'active', (select jsonb_build_object('id', m.id, 'game', m.game, 'opponent', (select username from public.profiles where id = case when m.a = u then m.b else m.a end))
      from public.matches m where m.status = 'live' and (m.a = u or m.b = u) limit 1),
    'requests', (select count(*) from public.friendships where addressee = u and status = 'pending'));
end;
$$;

revoke all on function public.match_join(uuid) from public, anon;
grant execute on function public.match_join(uuid) to authenticated;
