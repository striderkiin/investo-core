-- Trigger functions are never called directly.
alter function public.hq_touch_updated_at() set search_path = public;
revoke all on function public.log_site_change() from public, anon, authenticated;
revoke all on function public.hq_touch_updated_at() from public, anon, authenticated;
