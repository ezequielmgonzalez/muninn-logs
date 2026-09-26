-- Match the hosted projects, created with "Automatically expose new tables"
-- turned off: new tables and sequences in public get no privileges for the
-- API roles until a migration grants them. Without this, local and CI would
-- grant them by default, and a forgotten grant would only fail in production.
--
-- New functions still get EXECUTE through PUBLIC (a Postgres default), so
-- migrations keep revoking it explicitly, as find_profile_by_username() does.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
