-- delete_my_account(): leaving without breaking anyone else's history.
--
-- Ana deletes her account. Bob is her friend; Carla isn't. Guests: Jessi and
-- Solo (Ana's). Matches:
--   m1  logged by Ana: Ana 30, Bob 20          -> passes to Bob
--   m2  logged by Ana: Ana 10, Solo 5          -> deleted (only guests)
--   m3  logged by Bob: Ana 50, Bob 40          -> stays; Ana becomes anonymous
--   m4  logged by Carla: Carla 9, Jessi 3      -> Jessi passes to Carla
-- Ana also has a pending request asking Bob whether he's Jessi.
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

set constraints all immediate;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'carla@example.com');
update public.players set id = 'f0000000-0000-0000-0000-000000000001' where user_id = '11111111-1111-1111-1111-111111111111';
update public.players set id = 'f0000000-0000-0000-0000-000000000002' where user_id = '22222222-2222-2222-2222-222222222222';
update public.players set id = 'f0000000-0000-0000-0000-000000000003' where user_id = '33333333-3333-3333-3333-333333333333';

insert into public.friendships (requester_id, addressee_id, status, accepted_at)
values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted', now());

insert into public.players (id, owner_id, name) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Jessi'),
  ('b0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Solo');

insert into public.matches (id, game_id, created_by, played_on)
select m.id, g.id, m.created_by, '2026-09-01'
from public.games g,
  (values ('e0000000-0000-0000-0000-000000000001'::uuid, '11111111-1111-1111-1111-111111111111'::uuid),
          ('e0000000-0000-0000-0000-000000000002'::uuid, '11111111-1111-1111-1111-111111111111'::uuid),
          ('e0000000-0000-0000-0000-000000000003'::uuid, '22222222-2222-2222-2222-222222222222'::uuid),
          ('e0000000-0000-0000-0000-000000000004'::uuid, '33333333-3333-3333-3333-333333333333'::uuid)) as m(id, created_by)
where g.slug = 'arnak';

insert into public.match_players (match_id, player_id, turn_order)
values
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 1),
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 2),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 1),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 2),
  ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 1),
  ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 2),
  ('e0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003', 1),
  ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 2);

insert into public.match_player_scores (match_id, player_id, category_id, points)
select mp.match_id, mp.player_id, c.id, case when c.slug = 'research' then v.total else 0 end
from public.match_players mp
join (values
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 30),
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'f0000000-0000-0000-0000-000000000002'::uuid, 20),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 10),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, 5),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 50),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'f0000000-0000-0000-0000-000000000002'::uuid, 40),
  ('e0000000-0000-0000-0000-000000000004'::uuid, 'f0000000-0000-0000-0000-000000000003'::uuid, 9),
  ('e0000000-0000-0000-0000-000000000004'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 3)
) as v(match_id, player_id, total) on v.match_id = mp.match_id and v.player_id = mp.player_id
cross join public.score_categories c
where c.game_id = (select game_id from public.matches where id = mp.match_id);

insert into public.guest_claims (guest_id, user_id, requested_by)
values ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- The preview, then the deletion, as Ana
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  public.account_deletion_preview(),
  '{"matches_deleted": 1, "matches_transferred": 1, "places_anonymized": 2, "guests_transferred": 1, "guests_deleted": 1}'::jsonb,
  'the preview counts what will happen'
);

select lives_ok($$ select public.delete_my_account() $$, 'Ana deletes her account');

reset role;

select ok(
  not exists (select 1 from auth.users where id = '11111111-1111-1111-1111-111111111111')
  and not exists (select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'her account and profile are gone'
);

select ok(
  not exists (select 1 from public.players where user_id = '11111111-1111-1111-1111-111111111111'),
  'and so is her player'
);

select is_empty(
  $$ select * from public.friendships where '11111111-1111-1111-1111-111111111111' in (requester_id, addressee_id) $$,
  'her friendships are gone'
);

select is_empty('select * from public.guest_claims', 'her link requests are gone');

select is(
  (select created_by from public.matches where id = 'e0000000-0000-0000-0000-000000000001'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'm1, which Bob played, now belongs to Bob'
);

select ok(
  not exists (select 1 from public.matches where id = 'e0000000-0000-0000-0000-000000000002'),
  'm2, with only her and a guest, is deleted'
);

select results_eq(
  $$ select mp.match_id, p.name, p.owner_id
     from public.match_players mp join public.players p on p.id = mp.player_id
     where p.user_id is null and p.name = 'Jugador eliminado'
       and mp.match_id::text like 'e0000000-%'
     order by mp.match_id $$,
  $$ values ('e0000000-0000-0000-0000-000000000001'::uuid, 'Jugador eliminado', '22222222-2222-2222-2222-222222222222'::uuid),
            ('e0000000-0000-0000-0000-000000000003'::uuid, 'Jugador eliminado', '22222222-2222-2222-2222-222222222222'::uuid) $$,
  'her place in the remaining matches is an anonymous guest owned by their logger'
);

select results_eq(
  $$ select p.name, r.total, r.is_winner
     from public.match_results r join public.players p on p.id = r.player_id
     where r.match_id = 'e0000000-0000-0000-0000-000000000003'
     order by r.rank $$,
  $$ values ('Jugador eliminado', 50, true), (null::text, 40, false) $$,
  'scores stay: m3''s winner and totals are unchanged'
);

select is(
  (select owner_id from public.players where id = 'b0000000-0000-0000-0000-000000000001'),
  '33333333-3333-3333-3333-333333333333'::uuid,
  'her guest Jessi, still in Carla''s match, now belongs to Carla'
);

select ok(
  not exists (select 1 from public.players where id = 'b0000000-0000-0000-0000-000000000002'),
  'her guest Solo, who only played the deleted match, is gone'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (public.get_player_stats('22222222-2222-2222-2222-222222222222') ->> 'games')::int,
  2,
  'Bob keeps both his games'
);

select results_eq(
  $$ select id from public.matches order by id $$,
  $$ values ('e0000000-0000-0000-0000-000000000001'::uuid), ('e0000000-0000-0000-0000-000000000003'::uuid) $$,
  'Bob still sees both matches, and can now edit m1'
);

-- ---------------------------------------------------------------------------
-- Who can call it
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select public.delete_my_account() $$,
  '42501', null,
  'signed-out visitors can''t delete anything'
);

select throws_ok(
  $$ select public.account_deletion_preview() $$,
  '42501', null,
  'or preview it'
);

select * from finish();
rollback;
