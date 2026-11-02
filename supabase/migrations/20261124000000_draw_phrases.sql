-- Versus: Zeichnen & Raten (draw) an Online-Tischen (2-4 Plätze) und schnelle Sätze in Online-Partien (match_react).
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen bisherigen Migrationen auf.

alter table public.party_tables drop constraint if exists party_tables_game_check;
alter table public.party_tables add constraint party_tables_game_check
  check (game in ('ludo', 'ladder', 'yacht', 'maumau', 'memory', 'poker', 'hangman', 'slf', 'schnapsen', 'guess', 'code', 'domino', 'draw'));

create or replace function public.party_create(gm text, op jsonb default '{}'::jsonb, n integer default 4, lvl integer default 1, pub boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); c text; abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i integer; t public.party_tables;
begin
  perform public.party_sweep();
  if gm not in ('ludo', 'ladder', 'yacht', 'maumau', 'memory', 'poker', 'hangman', 'slf', 'schnapsen', 'guess', 'code', 'domino', 'draw') then raise exception 'Dieses Spiel gibt es an Tischen noch nicht.'; end if;
  if gm in ('schnapsen', 'code') then n := 2; end if;
  if n not between 2 and 4 then raise exception 'Zwei bis vier Spieler.'; end if;
  if op is null or jsonb_typeof(op) <> 'object' or octet_length(op::text) > 500 then op := '{}'::jsonb; end if;
  perform public.party_free_me(u);
  loop
    c := '';
    for i in 1..5 loop c := c || substr(abc, 1 + floor(random() * length(abc))::integer, 1); end loop;
    exit when not exists (select 1 from public.party_tables where code = c);
  end loop;
  insert into public.party_tables (code, game, opts, n, lvl, open, seats, seen)
    values (c, gm, op, n, least(greatest(coalesce(lvl, 1), 0), 3), coalesce(pub, false),
      array[u, null, null, null]::uuid[], array[now(), null, null, null]::timestamptz[])
    returning * into t;
  return public.party_view(t, 0, u);
end;
$$;

-- schnelle Sätze: feste Sätze statt freiem Chat, als Kennung gespeichert (jeder liest sie in seiner Sprache)
create or replace function public.match_react(mid uuid, e text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches; rid bigint; player boolean;
begin
  select * into m from public.matches where id = mid;
  if m.id is null then raise exception 'Partie nicht gefunden.'; end if;
  player := u = m.a or u = m.b;
  if not player and not public.can_watch(m, u) then raise exception 'Partie nicht gefunden.'; end if;
  if e not in ('gg', 'wow', 'haha', 'oops', 'think', 'fire', 'clap', 'sweat') and not (player and e in ('p_gl', 'p_nice', 'p_wp', 'p_close', 'p_think', 'p_hurry', 'p_oops', 'p_lucky', 'p_ty', 'p_sorry', 'p_rev', 'p_bye')) then
    raise exception 'Unbekannte Reaktion.';
  end if;
  if player and not (m.status = 'live' or (m.status in ('done', 'void') and m.finished_at > now() - interval '3 minutes')) then return null; end if;
  if not player and not (m.status = 'live' or (m.status in ('done', 'void') and m.finished_at > now() - interval '1 minute')) then return null; end if;
  if exists (select 1 from public.match_reactions r where r.match_id = mid and r.uid = u
      and r.at > now() - (case when player then interval '1 second' else interval '2 seconds' end)) then return null; end if;
  if (select count(*) from public.match_reactions r where r.match_id = mid and r.uid = u) >= (case when player then 80 else 30 end) then return null; end if;
  insert into public.match_reactions (match_id, uid, e) values (mid, u, e) returning id into rid;
  return rid;
end;
$$;
