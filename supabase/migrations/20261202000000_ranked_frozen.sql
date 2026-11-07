-- Versus: ob eine Partie für die Rangliste zählt, wird beim Ende der Partie festgehalten
-- Bisher hat match_ranked (und party_ranked bei Tischen) bei jedem Aufruf neu nachgesehen, ob gerade ein Dev-Konto
-- oder ein Gast beteiligt ist. Wurde jemand kurz zum Dev gemacht und danach wieder nicht, zählten seine Partien aus
-- der Dev-Zeit plötzlich doch in der Siege-Rangliste, aber nie in der Elo (die wird am Ende der Partie gespeichert).
-- Jetzt steht die Entscheidung an der Partie: matches.ranked und party_tables.dev_seat, gesetzt, wenn die Partie zu
-- Ende geht. Ein späterer Wechsel (Dev an/aus, Gast wird Konto) ändert alte Partien nicht mehr.
-- Ob ein Spieler gerade Dev ist, blendet ihn weiterhin aus der Rangliste aus (not p.dev in den Ranglisten).
-- Einmal im Supabase SQL-Editor ausführen. Baut auf 20261201000000_elo.sql auf.

-- ---------- Duelle ----------
alter table public.matches add column if not exists ranked boolean;

-- festgehalten, sonst (Partie läuft noch) wie bisher nachsehen
create or replace function public.match_ranked(m public.matches)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(m.ranked, not public.is_dev(m.a) and not public.is_dev(m.b) and not public.is_guest(m.a) and not public.is_guest(m.b));
$$;
revoke all on function public.match_ranked(public.matches) from public, anon, authenticated;

create or replace function public.matches_ranked()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'done' and new.ranked is null and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.ranked := not public.is_dev(new.a) and not public.is_dev(new.b) and not public.is_guest(new.a) and not public.is_guest(new.b);
  end if;
  return new;
end;
$$;
revoke all on function public.matches_ranked() from public, anon, authenticated;
drop trigger if exists matches_ranked on public.matches;
create trigger matches_ranked before insert or update on public.matches for each row execute function public.matches_ranked();

-- schon beendete Partien: die Elo wurde genau für die gewerteten vergeben (seit 20261201000000_elo.sql beim Ende der
-- Partie), also zählt, was eine Elo-Änderung hat. Partien ohne zweiten Spieler haben nie eine Elo, die bleiben wie bisher.
update public.matches m set ranked = case when m.a is null or m.b is null then public.match_ranked(m) else m.a_delta is not null end
  where m.status = 'done' and m.ranked is null;

-- ---------- Tische ----------
-- Ein Dev-Konto am Tisch wird beim Ende festgehalten; die Bestätigungen der Ergebnisse (claims) zählen weiter live.
alter table public.party_tables add column if not exists dev_seat boolean;

create or replace function public.party_has_dev(t public.party_tables)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from generate_series(1, t.n) i where t.seats[i] is not null and public.is_dev(t.seats[i]));
$$;
revoke all on function public.party_has_dev(public.party_tables) from public, anon, authenticated;

create or replace function public.party_ranked(t public.party_tables)
returns boolean language sql stable security definer set search_path = '' as $$
  select t.status = 'done'
    and (select count(*) from generate_series(1, t.n) i where t.seats[i] is not null) >= 2
    and (select count(*) from jsonb_each_text(t.claims)) >= 2
    and (select count(distinct x.value) from jsonb_each_text(t.claims) x) = 1
    and (select min(x.value)::integer from jsonb_each_text(t.claims) x) = coalesce(t.winner, 0)
    and not coalesce(t.dev_seat, public.party_has_dev(t));
$$;
revoke all on function public.party_ranked(public.party_tables) from public, anon, authenticated;

create or replace function public.party_tables_dev()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'done' and new.dev_seat is null and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.dev_seat := public.party_has_dev(new);
  end if;
  return new;
end;
$$;
revoke all on function public.party_tables_dev() from public, anon, authenticated;
drop trigger if exists party_tables_dev on public.party_tables;
create trigger party_tables_dev before insert or update on public.party_tables for each row execute function public.party_tables_dev();

-- schon beendete Tische: wer jetzt Dev ist (frühere Wechsel lassen sich nicht mehr nachvollziehen)
update public.party_tables t set dev_seat = public.party_has_dev(t) where t.status = 'done' and t.dev_seat is null;
