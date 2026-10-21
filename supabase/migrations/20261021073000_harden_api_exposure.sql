-- Keep internal tables and the signup trigger out of the public API.
-- RLS already blocks row access; this also hides them from GraphQL
-- introspection and stops handle_new_user being callable as an RPC.

REVOKE ALL ON public.legacy_jobs, public.legacy_employers, public.raw_crawl_jobs FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
