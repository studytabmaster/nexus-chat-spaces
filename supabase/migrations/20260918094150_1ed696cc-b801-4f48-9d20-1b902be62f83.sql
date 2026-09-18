CREATE OR REPLACE FUNCTION public.user_cosmetics_v2(_user_ids uuid[])
RETURNS TABLE(user_id uuid, frame text, frame_image text, title text, background text, background_image text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id,
    MAX(CASE WHEN i.kind = 'frame' THEN i.payload END),
    MAX(CASE WHEN i.kind = 'frame' THEN i.image_url END),
    MAX(CASE WHEN i.kind = 'title' THEN i.payload END),
    MAX(CASE WHEN i.kind = 'background' THEN i.payload END),
    MAX(CASE WHEN i.kind = 'background' THEN i.image_url END)
  FROM public.shop_purchases p
  JOIN public.shop_items i ON i.id = p.item_id
  WHERE p.equipped
    AND p.user_id = ANY(_user_ids)
    AND public.can_view_profile(p.user_id)
  GROUP BY p.user_id
$$;
REVOKE ALL ON FUNCTION public.user_cosmetics_v2(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_cosmetics_v2(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_cosmetics_v2(uuid[]) TO service_role;