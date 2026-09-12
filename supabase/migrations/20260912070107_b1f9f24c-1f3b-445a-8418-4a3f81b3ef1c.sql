REVOKE ALL ON FUNCTION public.record_activity(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.claim_mission(text) FROM anon;
REVOKE ALL ON FUNCTION public.purchase_shop_item(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.equip_shop_item(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.revoke_points(uuid, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.points_leaderboard(integer) FROM anon;
REVOKE ALL ON FUNCTION public.confirm_referral(uuid) FROM anon, authenticated;
