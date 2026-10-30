-- Discord Activity: a guest who plays in Discord gets their Discord name instead of gast_12345.
-- Only the Edge Function "discord" calls this (service role), after Discord has confirmed who the player is.
-- Taken or not allowed names get a number (felix → felix2); real accounts keep their name.

create or replace function public.discord_guest_name(u uuid, wanted text)
returns text language plpgsql security definer set search_path = '' as $$
declare base text; nm text; i integer := 0;
begin
  if not public.is_guest(u) then return (select username from public.profiles where id = u); end if;
  -- Discord names are a–z, 0–9, _ and . (2 to 32 characters); Versus names a–z, 0–9, _ and - (3 to 16)
  base := trim(both '_' from left(regexp_replace(lower(coalesce(wanted, '')), '[^a-z0-9_-]+', '_', 'g'), 16));
  if length(base) < 3 then base := left(base || '_dc', 16); end if;
  if public.bad_name(base) then return (select username from public.profiles where id = u); end if;
  nm := base;
  while public.bad_name(nm) or exists (select 1 from public.profiles where username = nm and id <> u) loop
    i := i + 1;
    if i > 50 then return (select username from public.profiles where id = u); end if;
    nm := left(base, 16 - length((i + 1)::text)) || (i + 1)::text;
  end loop;
  update public.profiles set username = nm where id = u;
  return nm;
end;
$$;
revoke all on function public.discord_guest_name(uuid, text) from public, anon, authenticated;
grant execute on function public.discord_guest_name(uuid, text) to service_role;
