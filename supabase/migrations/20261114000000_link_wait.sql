-- Versus: Spiel-Links verfallen nicht mehr, während der Gastgeber den Link verschickt.
-- Bisher lief eine Herausforderung ab, sobald ihr Ersteller 30 Sekunden nicht nachgefragt hat. Beim Teilen über
-- WhatsApp & Co. ist die App aber im Hintergrund. Spiel-Links (private) gelten jetzt 15 Minuten ab dem Erstellen.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf 20261113000000_links_async_push.sql auf.

create or replace function public.match_sweep()
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  update public.matches set status = 'expired', finished_at = now()
    where status = 'invited' and not async and not private and (a_seen < now() - interval '30 seconds' or created_at < now() - interval '10 minutes');
  -- Spiel-Links: 15 Minuten, auch wenn die App des Gastgebers so lange im Hintergrund ist
  update public.matches set status = 'expired', finished_at = now()
    where status = 'invited' and private and created_at < now() - interval '15 minutes';
  -- Einladungen über Tage: drei Tage Zeit zum Annehmen
  update public.matches set status = 'expired', finished_at = now()
    where status = 'invited' and async and created_at < now() - interval '3 days';
  -- eine Ergebnismeldung, die andere Seite meldet sich nicht mehr: die eine gilt
  for r in select id, coalesce(a_claim, b_claim) as c from public.matches
      where status = 'live' and (a_claim is null) <> (b_claim is null)
        and ((coalesce(a_claim, b_claim) ->> 't')::timestamptz < now() - interval '20 seconds') loop
    perform public.match_close(r.id, (r.c ->> 'w')::integer, case when (r.c ->> 'w')::integer = 0 then 'draw' else 'win' end);
  end loop;
  -- wer 75 Sekunden weg ist: Partie abgebrochen, niemand gewinnt (nicht bei Partien über Tage)
  update public.matches set status = 'void', finished_at = now(), winner = null, result = 'offline'
    where status = 'live' and not async and least(a_seen, coalesce(b_seen, a_seen)) < now() - interval '75 seconds';
  -- Partie über Tage: sieben Tage kein Zug, dann endet sie ohne Sieger
  update public.matches set status = 'void', finished_at = now(), winner = null, result = 'offline'
    where status = 'live' and async and coalesce(last_move_at, started_at, created_at) < now() - interval '7 days';
end;
$$;
revoke all on function public.match_sweep() from public, anon, authenticated;

-- Beitritt über einen Spiel-Link: der Gastgeber ist vielleicht noch im Messenger. Er bekommt ab jetzt 75 Sekunden,
-- um zurückzukommen (statt dass die Partie wegen "offline" sofort endet), und eine Benachrichtigung.
create or replace function public.match_join(mid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches;
begin
  perform public.match_sweep();
  if public.busy(u) then
    raise exception 'Beende erst deine laufende Partie.';
  end if;
  if exists (select 1 from public.matches x where x.id = mid and public.blocked_between(x.a, u)) then
    raise exception 'Da war jemand schneller, oder die Herausforderung gilt nicht mehr.';
  end if;
  update public.matches set b = u, status = 'live', started_at = now(), b_seen = now(),
    a_seen = case when private then now() else a_seen end,
    a_side = case when random() < 0.5 then 1 else 2 end
    where id = mid and b is null and status = 'invited' and a <> u
    returning * into m;
  if m.id is null then raise exception 'Da war jemand schneller, oder die Herausforderung gilt nicht mehr.'; end if;
  update public.matches set status = 'canceled', finished_at = now() where a = u and status = 'invited' and not async;
  update public.matches set status = 'declined', finished_at = now() where b = u and status = 'invited' and not async and id <> mid;
  return public.match_view(m, 0, u);
end;
$$;
revoke all on function public.match_join(uuid) from public, anon;
grant execute on function public.match_join(uuid) to authenticated;

create or replace function public.matches_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare mover integer; to_side integer; who uuid; target uuid;
begin
  if tg_op = 'INSERT' then
    if new.b is not null and new.status = 'invited' then
      perform public.push_notify(new.b, case when new.async then 'invite_async' else 'invite' end,
        (select username from public.profiles where id = new.a), new.game, new.id);
    end if;
    return new;
  end if;
  if new.async and new.status = 'live' and jsonb_array_length(new.moves) > jsonb_array_length(old.moves) then
    mover := (new.moves -> -1 ->> 's')::integer;
    to_side := 3 - coalesce(mover, 1);
    target := case when new.a_side = to_side then new.a else new.b end;
    who := case when target = new.a then new.b else new.a end;
    perform public.push_notify(target, 'turn', (select username from public.profiles where id = who), new.game, new.id);
  elsif new.async and old.status = 'invited' and new.status = 'live' then
    perform public.push_notify(new.a, 'accepted', (select username from public.profiles where id = new.b), new.game, new.id);
  elsif new.private and old.status = 'invited' and new.status = 'live' then
    perform public.push_notify(new.a, 'joined', (select username from public.profiles where id = new.b), new.game, new.id);
  end if;
  return new;
end;
$$;
