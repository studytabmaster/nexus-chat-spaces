-- 装備アイテムの公開参照
CREATE OR REPLACE FUNCTION public.user_cosmetics(_user_ids uuid[])
RETURNS TABLE(user_id uuid, frame text, frame_image text, title text, background text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id,
    MAX(CASE WHEN i.kind = 'frame' THEN i.payload END),
    MAX(CASE WHEN i.kind = 'frame' THEN i.image_url END),
    MAX(CASE WHEN i.kind = 'title' THEN i.payload END),
    MAX(CASE WHEN i.kind = 'background' THEN i.payload END)
  FROM public.shop_purchases p
  JOIN public.shop_items i ON i.id = p.item_id
  WHERE p.equipped AND p.user_id = ANY(_user_ids)
  GROUP BY p.user_id
$$;

REVOKE ALL ON FUNCTION public.user_cosmetics(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_cosmetics(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_cosmetics(uuid[]) TO authenticated;

-- カスタムロール
CREATE TABLE public.community_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#7c5cff',
  icon text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  permissions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_roles TO authenticated;
GRANT ALL ON public.community_roles TO service_role;
ALTER TABLE public.community_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select" ON public.community_roles FOR SELECT TO authenticated
  USING (public.can_view_community(community_id, auth.uid()));
CREATE POLICY "roles_insert" ON public.community_roles FOR INSERT TO authenticated
  WITH CHECK (public.can_manage(community_id, auth.uid()));
CREATE POLICY "roles_update" ON public.community_roles FOR UPDATE TO authenticated
  USING (public.can_manage(community_id, auth.uid()))
  WITH CHECK (public.can_manage(community_id, auth.uid()));
CREATE POLICY "roles_delete" ON public.community_roles FOR DELETE TO authenticated
  USING (public.can_manage(community_id, auth.uid()));

CREATE TRIGGER community_roles_touch BEFORE UPDATE ON public.community_roles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.community_member_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.community_roles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_member_roles TO authenticated;
GRANT ALL ON public.community_member_roles TO service_role;
ALTER TABLE public.community_member_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_roles_select" ON public.community_member_roles FOR SELECT TO authenticated
  USING (public.can_view_community(community_id, auth.uid()));
CREATE POLICY "member_roles_insert" ON public.community_member_roles FOR INSERT TO authenticated
  WITH CHECK (public.can_manage(community_id, auth.uid()));
CREATE POLICY "member_roles_delete" ON public.community_member_roles FOR DELETE TO authenticated
  USING (public.can_manage(community_id, auth.uid()));

CREATE INDEX community_member_roles_user_idx ON public.community_member_roles(community_id, user_id);
