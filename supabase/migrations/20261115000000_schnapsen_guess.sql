-- Versus: Schnapsen (schnapsen, immer genau 2 Plätze) und Schätzfragen (guess, 2-4) an Online-Tischen.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen bisherigen Migrationen auf.

alter table public.party_tables drop constraint if exists party_tables_game_check;
alter table public.party_tables add constraint party_tables_game_check
  check (game in ('ludo', 'ladder', 'yacht', 'maumau', 'memory', 'poker', 'hangman', 'slf', 'schnapsen', 'guess'));

create or replace function public.party_create(gm text, op jsonb default '{}'::jsonb, n integer default 4, lvl integer default 1, pub boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); c text; abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i integer; t public.party_tables;
begin
  perform public.party_sweep();
  if gm not in ('ludo', 'ladder', 'yacht', 'maumau', 'memory', 'poker', 'hangman', 'slf', 'schnapsen', 'guess') then raise exception 'Dieses Spiel gibt es an Tischen noch nicht.'; end if;
  if gm = 'schnapsen' then n := 2; end if;
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

revoke all on function public.party_create(text, jsonb, integer, integer, boolean) from public, anon;
grant execute on function public.party_create(text, jsonb, integer, integer, boolean) to authenticated;
