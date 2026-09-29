-- Claiming guest records: requests between friends, admin links, the merge.
--
-- Ana is friends with Bob; Carla is nobody's friend. Guests: Jessi and Toto
-- (Ana's), Xavi (Carla's). Matches, logged by Ana:
--   m1  Ana 30, Jessi 30 (Jessi won the tiebreak, leader mystic)
--   m2  Ana 20, Jessi 10
--   m3  Ana 5,  Toto 1,  Bob 9    (Toto and Bob both played: a conflict)
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

set constraints all immediate;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'carla@example.com');
update public.profiles set display_name = 'Ana' where id = '11111111-1111-1111-1111-111111111111';
update public.players set id = 'f0000000-0000-0000-0000-000000000001' where user_id = '11111111-1111-1111-1111-111111111111';
update public.players set id = 'f0000000-0000-0000-0000-000000000002' where user_id = '22222222-2222-2222-2222-222222222222';
update public.players set id = 'f0000000-0000-0000-0000-000000000003' where user_id = '33333333-3333-3333-3333-333333333333';

insert into public.friendships (requester_id, addressee_id, status, accepted_at)
values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted', now());

insert into public.players (id, owner_id, name) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Jessi'),
  ('b0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Toto'),
  ('b0000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Xavi');

insert into public.matches (id, game_id, created_by, played_on)
select m.id, g.id, '11111111-1111-1111-1111-111111111111', '2026-09-01'
from public.games g,
  (values ('e0000000-0000-0000-0000-000000000001'::uuid), ('e0000000-0000-0000-0000-000000000002'::uuid),
          ('e0000000-0000-0000-0000-000000000003'::uuid)) as m(id)
where g.slug = 'arnak';

insert into public.match_players (match_id, player_id, turn_order, character_id, won_tiebreak)
select v.match_id, v.player_id, v.turn, (select id from public.game_characters where slug = v.leader), v.tiebreak
from (values
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 1, null, false),
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 2, 'mystic', true),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 1, null, false),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 2, null, false),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 1, null, false),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, 2, null, false),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'f0000000-0000-0000-0000-000000000002'::uuid, 3, null, false)
) as v(match_id, player_id, turn, leader, tiebreak);

-- All points in research, to keep totals easy to read.
insert into public.match_player_scores (match_id, player_id, category_id, points)
select mp.match_id, mp.player_id, c.id,
  case when c.slug = 'research' then v.total else 0 end
from public.match_players mp
join (values
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 30),
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 30),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 20),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 10),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 5),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, 1),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'f0000000-0000-0000-0000-000000000002'::uuid, 9)
) as v(match_id, player_id, total) on v.match_id = mp.match_id and v.player_id = mp.player_id
cross join public.score_categories c
where c.game_id = (select game_id from public.matches where id = mp.match_id);

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Requests between friends
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.guest_claims (guest_id, user_id)
     values ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222') $$,
  'Ana asks her friend Bob whether he is her guest Jessi'
);

select throws_ok(
  $$ insert into public.guest_claims (guest_id, user_id)
     values ('b0000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333') $$,
  '42501', null,
  'Ana can''t ask Carla: they aren''t friends'
);

select throws_ok(
  $$ insert into public.guest_claims (guest_id, user_id)
     values ('b0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222') $$,
  '42501', null,
  'Ana can''t ask about Carla''s guest'
);

select throws_ok(
  $$ select public.admin_link_guest('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222') $$,
  '42501', 'only admins can link guests directly',
  'without the admin role, linking needs the other person''s yes'
);

select throws_ok(
  $$ select * from public.admin_list_guests() $$,
  '42501', null,
  'without the admin role, there''s no list of every guest'
);

select throws_ok(
  $$ select public.accept_guest_claim((select id from public.guest_claims)) $$,
  '42501', 'link request not found',
  'Ana can''t accept her own request on Bob''s behalf'
);

set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select is_empty(
  'select * from public.guest_claims',
  'Carla doesn''t see requests between other people'
);

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select results_eq(
  'select guest_name, requested_by_name, matches from public.list_received_guest_claims()',
  $$ values ('Jessi', 'Ana', 2) $$,
  'Bob sees the request: which guest, who asks, and how many matches it brings'
);

select is(
  public.accept_guest_claim((select id from public.guest_claims)),
  2,
  'Bob accepts and Jessi''s 2 matches move to him'
);

select results_eq(
  $$ select mp.match_id, mp.turn_order, c.slug, mp.won_tiebreak
     from public.match_players mp
     left join public.game_characters c on c.id = mp.character_id
     where mp.player_id = 'f0000000-0000-0000-0000-000000000002'
       and mp.match_id <> 'e0000000-0000-0000-0000-000000000003'
     order by mp.match_id $$,
  $$ values ('e0000000-0000-0000-0000-000000000001'::uuid, 2::smallint, 'mystic', true),
            ('e0000000-0000-0000-0000-000000000002'::uuid, 2::smallint, null, false) $$,
  'Bob takes Jessi''s turn order, leader and tiebreak win'
);

select results_eq(
  $$ select r.match_id, r.total, r.is_winner from public.match_results r
     where r.player_id = 'f0000000-0000-0000-0000-000000000002'
       and r.match_id <> 'e0000000-0000-0000-0000-000000000003'
     order by r.match_id $$,
  $$ values ('e0000000-0000-0000-0000-000000000001'::uuid, 30, true),
            ('e0000000-0000-0000-0000-000000000002'::uuid, 10, false) $$,
  'her scores come along: same totals, and he now wins m1 on the tiebreak'
);

select is(
  (select count(*)::integer from public.get_player_stats('22222222-2222-2222-2222-222222222222') s
   where (s ->> 'games')::int = 3),
  1,
  'Bob''s stats now count the 2 matches as his (3 with m3)'
);

-- Back as the database owner, to see through RLS.
reset role;

select ok(
  not exists (select 1 from public.players where id = 'b0000000-0000-0000-0000-000000000001'),
  'the guest Jessi is gone'
);

select is_empty(
  'select * from public.guest_claims',
  'and so is the request'
);

-- ---------------------------------------------------------------------------
-- Declining, and conflicts
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.guest_claims (guest_id, user_id)
values ('b0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222');

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select throws_ok(
  $$ select public.accept_guest_claim((select id from public.guest_claims)) $$,
  '23505', 'the guest and the user are both in 1 match(es)',
  'a guest who played in a match with the user can''t become them'
);

with declined as (delete from public.guest_claims returning 1)
select is((select count(*)::integer from declined), 1, 'Bob declines the request');

reset role;

select ok(
  exists (select 1 from public.match_players where player_id = 'b0000000-0000-0000-0000-000000000002'),
  'a declined request leaves the guest and their matches as they were'
);

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "app_metadata": {"role": "admin"}}';

select results_eq(
  $$ select name, owner_name, matches from public.admin_list_guests()
     where id::text like 'b0000000-%' $$,
  $$ values ('Toto', 'Ana', 1), ('Xavi', 'carla', 0) $$,
  'an admin sees every guest, whose it is and how many matches it has'
);

select is(
  public.admin_link_guest('b0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111'),
  0,
  'an admin links a guest to any account, without asking'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select * from public.list_received_guest_claims() $$,
  '42501', null,
  'signed-out visitors can''t see link requests'
);

select * from finish();
rollback;
