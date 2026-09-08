
REVOKE ALL ON FUNCTION public.moderate_member(uuid, uuid, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_member(uuid, uuid, text, text, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.transfer_ownership(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_ownership(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.block_banned_join() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.block_muted_message() FROM PUBLIC, anon, authenticated;
