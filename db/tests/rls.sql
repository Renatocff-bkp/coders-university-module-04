begin;

create extension if not exists pgtap;

select plan(5);

insert into auth_users (id, first_name, last_name, email, password_hash)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Ada',
    'One',
    'ada@example.com',
    'hash'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Grace',
    'Two',
    'grace@example.com',
    'hash'
  );

insert into organizations (id, name, slug)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', 'org-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', 'org-b');

insert into organization_members (organization_id, user_id, role)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'owner'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'owner'
  );

insert into projects (id, organization_id, name)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Project A'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Project B'
  );

set local role authenticated;
select set_config(
  'app.current_user_id',
  '11111111-1111-1111-1111-111111111111',
  true
);

select results_eq(
  $$ select name from organizations order by name $$,
  $$ values ('Org A') $$,
  'a member sees only their own organization'
);

select results_eq(
  $$ select name from projects order by name $$,
  $$ values ('Project A') $$,
  'a member sees only projects from their organization'
);

select results_eq(
  $$ select organization_id from organization_members $$,
  $$ values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid) $$,
  'a member sees only their own membership'
);

select throws_ok(
  'select * from auth_users',
  '42501',
  'permission denied for table auth_users',
  'authenticated cannot read auth tables directly'
);

select set_config(
  'app.current_user_id',
  '22222222-2222-2222-2222-222222222222',
  true
);

select results_eq(
  $$ select name from organizations order by name $$,
  $$ values ('Org B') $$,
  'another member sees only their own organization'
);

select * from finish();

rollback;
