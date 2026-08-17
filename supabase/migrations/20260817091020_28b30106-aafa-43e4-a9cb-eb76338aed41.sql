create or replace function public.get_platform_stats()
returns table(trees bigint, volunteers bigint, verified_trees bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.trees),
    (select count(*) from public.profiles),
    (select count(*) from public.trees where admin_status = 'approved')
$$;

revoke all on function public.get_platform_stats() from public;
grant execute on function public.get_platform_stats() to anon, authenticated, service_role;