REVOKE EXECUTE ON FUNCTION public.guard_role_permissions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_community_perm(uuid, uuid, text) FROM PUBLIC, anon;