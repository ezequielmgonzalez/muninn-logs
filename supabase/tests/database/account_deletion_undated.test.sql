-- delete_my_account() with undated matches: a guest goes to the logger of
-- their latest dated match, not of an undated one.
--
-- Ana deletes her account. Her guest Jessi played:
--   m1  logged by Bob,   dated 2026-09-01
--   m2  logged by Carla, undated (logged later)
begin;
create extension if not exists pgtap with schema extensions;

select plan(1);

set constraints all immediate;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'carla@example.com');

insert into public.players (id, owner_id, name) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Jessi');

insert into public.matches (id, game_id, created_by, played_on, created_at)
select m.id, g.id, m.created_by, m.played_on, m.created_at
from public.games g,
  (values ('e0000000-0000-0000-0000-000000000001'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, '2026-09-01'::date, now() - interval '1 day'),
          ('e0000000-0000-0000-0000-000000000002'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, null::date, now())) as m(id, created_by, played_on, created_at)
where g.slug = 'arnak';

insert into public.match_players (match_id, player_id, turn_order)
select m.id, p.id, p.turn
from (values ('e0000000-0000-0000-0000-000000000001'::uuid, '22222222-2222-2222-2222-222222222222'::uuid),
             ('e0000000-0000-0000-0000-000000000002'::uuid, '33333333-3333-3333-3333-333333333333'::uuid)) as m(id, logger)
cross join lateral (
  select id, 1 as turn from public.players where user_id = m.logger
  union all select 'b0000000-0000-0000-0000-000000000001'::uuid, 2
) as p;

insert into public.match_player_scores (match_id, player_id, category_id, points)
select mp.match_id, mp.player_id, c.id, 0
from public.match_players mp
join public.score_categories c on c.game_id = (select game_id from public.matches where id = mp.match_id)
where mp.match_id::text like 'e0000000-%';

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.delete_my_account();
reset role;

select is(
  (select owner_id from public.players where id = 'b0000000-0000-0000-0000-000000000001'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'her guest goes to the logger of their latest dated match, not an undated one'
);

select * from finish();
rollback;
