
-- 1. メンバーのタイムアウト
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS muted_until timestamptz;

-- 2. BAN
CREATE TABLE IF NOT EXISTS public.community_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_bans TO authenticated;
GRANT ALL ON public.community_bans TO service_role;
ALTER TABLE public.community_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bans_select_mod_or_self" ON public.community_bans FOR SELECT TO authenticated
  USING (public.can_moderate(community_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "bans_write_manager" ON public.community_bans FOR INSERT TO authenticated
  WITH CHECK (public.can_manage(community_id, auth.uid()));
CREATE POLICY "bans_delete_manager" ON public.community_bans FOR DELETE TO authenticated
  USING (public.can_manage(community_id, auth.uid()));

-- 3. モデレーション履歴
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('warn','timeout','untimeout','kick','ban','unban')),
  reason text NOT NULL DEFAULT '',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.moderation_actions TO authenticated;
GRANT ALL ON public.moderation_actions TO service_role;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mod_actions_select" ON public.moderation_actions FOR SELECT TO authenticated
  USING (public.can_moderate(community_id, auth.uid()) OR user_id = auth.uid());

-- 4. 監査ログ
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_manager" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.can_manage(community_id, auth.uid()));
CREATE POLICY "audit_insert_moderator" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.can_moderate(community_id, auth.uid()) AND actor_id = auth.uid());

-- 5. 通報
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('message','user','community')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam','harassment','inappropriate','other')),
  detail text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED','DISMISSED')),
  link text,
  preview text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert_self" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "reports_select" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR (community_id IS NOT NULL AND public.can_moderate(community_id, auth.uid())));
CREATE POLICY "reports_update_moderator" ON public.reports FOR UPDATE TO authenticated
  USING (community_id IS NOT NULL AND public.can_moderate(community_id, auth.uid()))
  WITH CHECK (community_id IS NOT NULL AND public.can_moderate(community_id, auth.uid()));
CREATE TRIGGER reports_touch BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. BAN 済みユーザーの再参加禁止
CREATE OR REPLACE FUNCTION public.block_banned_join()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.community_bans WHERE community_id = NEW.community_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'このコミュニティからBANされています';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS members_block_banned ON public.community_members;
CREATE TRIGGER members_block_banned BEFORE INSERT ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.block_banned_join();

-- 7. タイムアウト中は投稿不可
CREATE OR REPLACE FUNCTION public.block_muted_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE mu timestamptz;
BEGIN
  SELECT muted_until INTO mu FROM public.community_members
    WHERE community_id = NEW.community_id AND user_id = NEW.user_id;
  IF mu IS NOT NULL AND mu > now() THEN
    RAISE EXCEPTION 'タイムアウト中のため送信できません';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS messages_block_muted ON public.messages;
CREATE TRIGGER messages_block_muted BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.block_muted_message();

-- 8. モデレーション実行 RPC（オーナー保護つき）
CREATE OR REPLACE FUNCTION public.moderate_member(
  _community_id uuid, _user_id uuid, _action text, _reason text DEFAULT '', _minutes integer DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid();
        target_role public.community_role;
        my_role public.community_role;
        cname text;
        expires timestamptz;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  my_role := public.community_role_of(_community_id, me);
  target_role := public.community_role_of(_community_id, _user_id);
  IF my_role IS NULL OR my_role NOT IN ('owner','admin','moderator') THEN
    RAISE EXCEPTION 'この操作を実行する権限がありません';
  END IF;
  IF _user_id = me THEN RAISE EXCEPTION '自分自身には実行できません'; END IF;
  IF target_role = 'owner' THEN RAISE EXCEPTION 'オーナーには実行できません'; END IF;
  IF my_role = 'moderator' AND target_role IN ('admin','moderator') THEN
    RAISE EXCEPTION '自分より上位のロールには実行できません';
  END IF;
  IF my_role = 'admin' AND target_role = 'admin' THEN
    RAISE EXCEPTION '同じロールのメンバーには実行できません';
  END IF;
  IF _action IN ('kick','ban','unban') AND my_role NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'この操作を実行する権限がありません';
  END IF;

  SELECT name INTO cname FROM public.communities WHERE id = _community_id;

  IF _action = 'warn' THEN
    INSERT INTO public.notifications (user_id, actor_id, type, content, link)
      VALUES (_user_id, me, 'warned', '「' || cname || '」で警告を受けました' ||
        CASE WHEN _reason <> '' THEN '：' || _reason ELSE '' END, '/c/' || _community_id);
  ELSIF _action = 'timeout' THEN
    expires := now() + make_interval(mins => coalesce(_minutes, 10));
    UPDATE public.community_members SET muted_until = expires
      WHERE community_id = _community_id AND user_id = _user_id;
    INSERT INTO public.notifications (user_id, actor_id, type, content, link)
      VALUES (_user_id, me, 'timeout', '「' || cname || '」でタイムアウトされました', '/c/' || _community_id);
  ELSIF _action = 'untimeout' THEN
    UPDATE public.community_members SET muted_until = NULL
      WHERE community_id = _community_id AND user_id = _user_id;
  ELSIF _action = 'kick' THEN
    DELETE FROM public.community_members WHERE community_id = _community_id AND user_id = _user_id;
  ELSIF _action = 'ban' THEN
    INSERT INTO public.community_bans (community_id, user_id, reason, created_by)
      VALUES (_community_id, _user_id, coalesce(_reason,''), me)
      ON CONFLICT (community_id, user_id) DO UPDATE SET reason = EXCLUDED.reason;
    DELETE FROM public.community_members WHERE community_id = _community_id AND user_id = _user_id;
  ELSIF _action = 'unban' THEN
    DELETE FROM public.community_bans WHERE community_id = _community_id AND user_id = _user_id;
  ELSE
    RAISE EXCEPTION 'unknown action';
  END IF;

  INSERT INTO public.moderation_actions (community_id, user_id, actor_id, action, reason, expires_at)
    VALUES (_community_id, _user_id, me, _action, coalesce(_reason,''), expires);
  INSERT INTO public.audit_logs (community_id, actor_id, action, target, detail)
    VALUES (_community_id, me, _action, _user_id::text, coalesce(_reason,''));
END $$;

-- 9. オーナー移譲
CREATE OR REPLACE FUNCTION public.transfer_ownership(_community_id uuid, _new_owner uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF public.community_role_of(_community_id, me) <> 'owner' THEN
    RAISE EXCEPTION 'オーナーのみ実行できます';
  END IF;
  IF NOT public.is_member(_community_id, _new_owner) THEN
    RAISE EXCEPTION 'メンバーではありません';
  END IF;
  UPDATE public.community_members SET role = 'owner' WHERE community_id = _community_id AND user_id = _new_owner;
  UPDATE public.community_members SET role = 'admin' WHERE community_id = _community_id AND user_id = me;
  INSERT INTO public.audit_logs (community_id, actor_id, action, target, detail)
    VALUES (_community_id, me, 'transfer_owner', _new_owner::text, '');
END $$;
