-- New objects in public aren't exposed to the API roles until a migration
-- grants them, locally just like on the hosted projects.
begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

create table public.new_table_without_grants (id integer);
create sequence public.new_sequence_without_grants;

select ok(
  not has_table_privilege('authenticated', 'public.new_table_without_grants', 'select'),
  'signed-in users get no access to a new table by default'
);

select ok(
  not has_table_privilege('anon', 'public.new_table_without_grants', 'select'),
  'signed-out visitors get no access to a new table by default'
);

select ok(
  not has_sequence_privilege('authenticated', 'public.new_sequence_without_grants', 'usage'),
  'signed-in users get no access to a new sequence by default'
);

select * from finish();
rollback;
