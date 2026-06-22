-- The project was created with "Automatically expose new tables" disabled, so
-- the Data API roles never received CRUD grants. Grant full read/write to
-- service_role ONLY (the secret server key the app uses). anon/authenticated
-- stay without data access, so the public schema remains locked to the outside.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
