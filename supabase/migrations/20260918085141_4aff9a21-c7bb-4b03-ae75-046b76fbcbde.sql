-- プロフィール閲覧可否（本人 / 同じコミュニティ / DM相手 / フレンド / 運営）
CREATE OR REPLACE FUNCTION public.can_view_profile(_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    _id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.community_members a
      JOIN public.community_members b ON b.community_id = a.community_id
      WHERE a.user_id = auth.uid() AND b.user_id = _id
    )
    OR EXISTS (
      SELECT 1 FROM public.dm_members a
      JOIN public.dm_members b ON b.dm_id = a.dm_id
      WHERE a.user_id = auth.uid() AND b.user_id = _id
    )
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (f.requester_id = auth.uid() AND f.addressee_id = _id)
         OR (f.addressee_id = auth.uid() AND f.requester_id = _id)
    )
  )
$$;

REVOKE ALL ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated, service_role;

-- profiles: 全件閲覧を関係者のみに制限
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select_related" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.can_view_profile(id));

-- ディレクトリ用：公開しても問題のない列だけを返す
CREATE OR REPLACE FUNCTION public.search_profiles(_q text, _limit integer DEFAULT 20)
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, bio text, status text, custom_status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.bio,
         CASE WHEN p.show_online THEN p.status ELSE 'offline' END, p.custom_status
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND coalesce(btrim(_q), '') <> ''
    AND (p.username ILIKE '%' || _q || '%' OR p.display_name ILIKE '%' || _q || '%')
  ORDER BY p.username
  LIMIT least(coalesce(_limit, 20), 50)
$$;

REVOKE ALL ON FUNCTION public.search_profiles(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.profile_card(_id uuid)
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, bio text, status text, custom_status text, show_online boolean, allow_dms boolean, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.bio,
         CASE WHEN p.show_online THEN p.status ELSE 'offline' END,
         p.custom_status, p.show_online, p.allow_dms, p.created_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.id = _id
$$;

REVOKE ALL ON FUNCTION public.profile_card(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_card(uuid) TO authenticated;

-- ポイント残高：本人と運営のみ
DROP POLICY IF EXISTS "wallets readable" ON public.point_wallets;
CREATE POLICY "wallets readable" ON public.point_wallets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 実績の獲得記録：本人と運営のみ
DROP POLICY IF EXISTS "achievements visible" ON public.user_achievements;
CREATE POLICY "achievements visible" ON public.user_achievements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- バッジ所持：プロフィールを見られる相手の分だけ
DROP POLICY IF EXISTS "user_badges_select" ON public.user_badges;
CREATE POLICY "user_badges_select" ON public.user_badges
  FOR SELECT TO authenticated
  USING (public.can_view_profile(user_id));