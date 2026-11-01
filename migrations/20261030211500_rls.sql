create schema if not exists app;

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

comment on function app.current_user_id() is
  'Returns the user id set by the API for the current transaction.';

create or replace function app.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = app.current_user_id()
  )
$$;

comment on function app.is_organization_member(uuid) is
  'Security definer helper that checks membership without triggering RLS recursion.';

revoke all on function app.current_user_id() from public;
revoke all on function app.is_organization_member(uuid) from public;

grant usage on schema app to authenticated, service_role;
grant execute on function app.current_user_id() to authenticated, service_role;
grant execute on function app.is_organization_member(uuid) to authenticated, service_role;

alter table public.auth_users enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.auth_tokens enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;

revoke all on table public.auth_users, public.auth_sessions, public.auth_tokens
  from anon, authenticated;

revoke all on table public.organizations, public.organization_members, public.projects
  from anon;

grant select, insert, update, delete
  on table public.organizations, public.organization_members, public.projects
  to authenticated;

create policy "organizations_member_select"
  on public.organizations
  for select
  to authenticated
  using (app.is_organization_member(id));

create policy "organizations_member_update"
  on public.organizations
  for update
  to authenticated
  using (app.is_organization_member(id))
  with check (app.is_organization_member(id));

create policy "organizations_member_delete"
  on public.organizations
  for delete
  to authenticated
  using (app.is_organization_member(id));

create policy "organization_members_member_select"
  on public.organization_members
  for select
  to authenticated
  using (app.is_organization_member(organization_id));

create policy "organization_members_member_insert"
  on public.organization_members
  for insert
  to authenticated
  with check (app.is_organization_member(organization_id));

create policy "organization_members_member_update"
  on public.organization_members
  for update
  to authenticated
  using (app.is_organization_member(organization_id))
  with check (app.is_organization_member(organization_id));

create policy "organization_members_member_delete"
  on public.organization_members
  for delete
  to authenticated
  using (app.is_organization_member(organization_id));

create policy "projects_member_all"
  on public.projects
  for all
  to authenticated
  using (app.is_organization_member(organization_id))
  with check (app.is_organization_member(organization_id));
