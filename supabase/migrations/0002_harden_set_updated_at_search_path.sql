-- Harden the set_updated_at trigger function by pinning an empty search_path.
-- Resolves the Supabase linter warning 0011_function_search_path_mutable.
-- now() resolves from pg_catalog regardless, so an empty search_path is safe.
alter function public.set_updated_at() set search_path = '';
