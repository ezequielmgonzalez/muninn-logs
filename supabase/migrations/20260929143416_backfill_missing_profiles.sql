-- Every account has a profile and a player row. The sign-up trigger ensures
-- it for new accounts; this repairs accounts that outlive a rebuilt schema.
-- That happens when staging is reset (Reset staging workflow): Supabase keeps
-- auth.users, while public tables are recreated empty. Everywhere else this
-- finds nothing to do. Mirrors private.handle_new_user(); usernames are gone,
-- so those users go through onboarding again.

insert into public.profiles (id, display_name)
select
  u.id,
  left(coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(u.email, '@', 1), ''),
    'Player'
  ), 50)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

insert into public.players (user_id)
select p.id
from public.profiles p
where not exists (select 1 from public.players pl where pl.user_id = p.id);
