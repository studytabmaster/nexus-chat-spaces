CREATE OR REPLACE FUNCTION public.has_community_perm(_community_id uuid, _user_id uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.can_manage(_community_id, _user_id) OR EXISTS (
    SELECT 1 FROM public.community_member_roles mr
    JOIN public.community_roles r ON r.id = mr.role_id
    WHERE mr.community_id = _community_id AND mr.user_id = _user_id AND _perm = ANY(r.permissions)
  )
$$;

-- 権限昇格防止: 管理者以外は自分が持つ権限しかロールに付けられない
CREATE OR REPLACE FUNCTION public.guard_role_permissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p text;
BEGIN
  IF public.can_manage(NEW.community_id, auth.uid()) THEN RETURN NEW; END IF;
  FOREACH p IN ARRAY NEW.permissions LOOP
    IF NOT public.has_community_perm(NEW.community_id, auth.uid(), p) THEN
      RAISE EXCEPTION '自分が持っていない権限は付与できません';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS community_roles_guard ON public.community_roles;
CREATE TRIGGER community_roles_guard BEFORE INSERT OR UPDATE ON public.community_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_role_permissions();

DROP POLICY IF EXISTS roles_insert ON public.community_roles;
DROP POLICY IF EXISTS roles_update ON public.community_roles;
DROP POLICY IF EXISTS roles_delete ON public.community_roles;
CREATE POLICY roles_insert ON public.community_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_community_perm(community_id, auth.uid(), 'manage_roles'));
CREATE POLICY roles_update ON public.community_roles FOR UPDATE TO authenticated
  USING (public.has_community_perm(community_id, auth.uid(), 'manage_roles'))
  WITH CHECK (public.has_community_perm(community_id, auth.uid(), 'manage_roles'));
CREATE POLICY roles_delete ON public.community_roles FOR DELETE TO authenticated
  USING (public.has_community_perm(community_id, auth.uid(), 'manage_roles'));

DROP POLICY IF EXISTS member_roles_insert ON public.community_member_roles;
DROP POLICY IF EXISTS member_roles_delete ON public.community_member_roles;
CREATE POLICY member_roles_insert ON public.community_member_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_community_perm(community_id, auth.uid(), 'manage_roles'));
CREATE POLICY member_roles_delete ON public.community_member_roles FOR DELETE TO authenticated
  USING (public.has_community_perm(community_id, auth.uid(), 'manage_roles'));

DROP POLICY IF EXISTS messages_delete ON public.messages;
CREATE POLICY messages_delete ON public.messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_moderate(community_id, auth.uid())
    OR public.has_community_perm(community_id, auth.uid(), 'manage_messages'));