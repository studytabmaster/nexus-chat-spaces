-- ============ ポイント基盤 ============
CREATE TABLE public.point_wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime integer NOT NULL DEFAULT 0 CHECK (lifetime >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.point_wallets TO authenticated;
GRANT ALL ON public.point_wallets TO service_role;
ALTER TABLE public.point_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets readable" ON public.point_wallets FOR SELECT TO authenticated USING (true);

CREATE TABLE public.point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  label text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT '',
  source_id uuid,
  dedupe_key text,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','pending','revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX point_events_dedupe ON public.point_events (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX point_events_user_created ON public.point_events (user_id, created_at DESC);
GRANT SELECT ON public.point_events TO authenticated;
GRANT ALL ON public.point_events TO service_role;
ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own point events" ON public.point_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.point_rules (
  key text PRIMARY KEY,
  label text NOT NULL,
  points integer NOT NULL,
  daily_cap integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.point_rules TO authenticated;
GRANT ALL ON public.point_rules TO service_role;
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules readable" ON public.point_rules FOR SELECT TO authenticated USING (true);

INSERT INTO public.point_rules (key, label, points, daily_cap) VALUES
  ('daily_login','ログインボーナス',10,10),
  ('message','メッセージ投稿',1,30),
  ('post','投稿を作成',5,25),
  ('comment','コメント',2,20),
  ('poll_vote','投票に参加',3,15),
  ('event_rsvp','イベントに参加',5,20),
  ('invite_confirmed','招待成立',100,500),
  ('mission','ミッション達成',0,300),
  ('achievement','実績解除',0,1000);

-- ============ ミッション ============
CREATE TABLE public.mission_defs (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  rule_key text NOT NULL,
  target integer NOT NULL DEFAULT 1,
  points integer NOT NULL DEFAULT 10,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.mission_defs TO authenticated;
GRANT ALL ON public.mission_defs TO service_role;
ALTER TABLE public.mission_defs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missions readable" ON public.mission_defs FOR SELECT TO authenticated USING (true);

INSERT INTO public.mission_defs (key, name, description, rule_key, target, points, position) VALUES
  ('login','ログインする','1日1回ログインしよう','daily_login',1,10,1),
  ('chat3','メッセージを3件送る','どこかのチャンネルで発言しよう','message',3,15,2),
  ('post1','投稿を1件作成する','コミュニティに投稿しよう','post',1,20,3),
  ('vote1','投票に参加する','どれかの投票に answer しよう','poll_vote',1,15,4),
  ('event1','イベントに参加表明する','気になるイベントに参加しよう','event_rsvp',1,20,5);

CREATE TABLE public.mission_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_key text NOT NULL REFERENCES public.mission_defs(key) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Tokyo')::date,
  progress integer NOT NULL DEFAULT 0,
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_key, day)
);
GRANT SELECT ON public.mission_progress TO authenticated;
GRANT ALL ON public.mission_progress TO service_role;
ALTER TABLE public.mission_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mission progress" ON public.mission_progress FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============ 実績 ============
CREATE TABLE public.achievement_defs (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'trophy',
  points integer NOT NULL DEFAULT 0,
  threshold integer NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'lifetime'
);
GRANT SELECT ON public.achievement_defs TO authenticated;
GRANT ALL ON public.achievement_defs TO service_role;
ALTER TABLE public.achievement_defs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements readable" ON public.achievement_defs FOR SELECT TO authenticated USING (true);

INSERT INTO public.achievement_defs (key, name, description, icon, points, threshold, kind) VALUES
  ('first_points','はじめの一歩','はじめてポイントを獲得した','sparkles',5,1,'lifetime'),
  ('points_500','コツコツ500','累計500ポイント獲得','star',50,500,'lifetime'),
  ('points_2000','常連さん','累計2000ポイント獲得','award',150,2000,'lifetime'),
  ('level_5','レベル5到達','レベル5になった','trending-up',50,5,'level'),
  ('level_10','レベル10到達','レベル10になった','crown',200,10,'level'),
  ('inviter_3','招待の達人','3人の招待を成立させた','users',150,3,'invites');

CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_key text NOT NULL REFERENCES public.achievement_defs(key) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);
GRANT SELECT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements visible" ON public.user_achievements FOR SELECT TO authenticated USING (true);

-- ============ 招待 ============
CREATE TABLE public.invite_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  invite_code text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  UNIQUE (invitee_id)
);
CREATE INDEX invite_referrals_inviter ON public.invite_referrals (inviter_id, created_at DESC);
GRANT SELECT ON public.invite_referrals TO authenticated;
GRANT ALL ON public.invite_referrals TO service_role;
ALTER TABLE public.invite_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referrals" ON public.invite_referrals FOR SELECT TO authenticated
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ 不正対策 / 監査 ============
CREATE TABLE public.fraud_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,
  detail text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.fraud_flags TO authenticated;
GRANT ALL ON public.fraud_flags TO service_role;
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read flags" ON public.fraud_flags FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update flags" ON public.fraud_flags FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER fraud_flags_touch BEFORE UPDATE ON public.fraud_flags FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.service_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_audit_logs TO authenticated;
GRANT ALL ON public.service_audit_logs TO service_role;
ALTER TABLE public.service_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read service audit" ON public.service_audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ 公式Shop ============
CREATE TABLE public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('frame','background','badge','title','theme','emoji','sticker','reaction','limited')),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  payload text NOT NULL DEFAULT '',
  price integer NOT NULL CHECK (price >= 0),
  stock integer,
  sold integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  published boolean NOT NULL DEFAULT false,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','pending','approved','rejected')),
  ai_generated boolean NOT NULL DEFAULT false,
  season text NOT NULL DEFAULT '',
  restock_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_items TO authenticated;
GRANT SELECT ON public.shop_items TO anon;
GRANT ALL ON public.shop_items TO service_role;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published items readable" ON public.shop_items FOR SELECT
  USING ((published AND review_status = 'approved') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins create items" ON public.shop_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update items" ON public.shop_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete items" ON public.shop_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER shop_items_touch BEFORE UPDATE ON public.shop_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.shop_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  price_paid integer NOT NULL,
  equipped boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
GRANT SELECT ON public.shop_purchases TO authenticated;
GRANT ALL ON public.shop_purchases TO service_role;
ALTER TABLE public.shop_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own purchases" ON public.shop_purchases FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ 関数 ============
CREATE OR REPLACE FUNCTION public.point_level(_lifetime integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT greatest(1, floor(sqrt(greatest(_lifetime,0)::numeric / 100))::int + 1)
$$;

CREATE OR REPLACE FUNCTION public.award_points(
  _user_id uuid, _rule_key text, _points integer, _label text,
  _dedupe_key text DEFAULT NULL, _source_type text DEFAULT '', _source_id uuid DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.point_rules%ROWTYPE; today_total int; recent int; granted int;
BEGIN
  IF _user_id IS NULL OR _points <= 0 THEN RETURN 0; END IF;
  SELECT * INTO r FROM public.point_rules WHERE key = _rule_key;
  IF r.key IS NULL THEN RETURN 0; END IF;

  -- レート制限：直近1分に20件以上の付与は不正の可能性
  SELECT count(*) INTO recent FROM public.point_events
    WHERE user_id = _user_id AND created_at > now() - interval '1 minute';
  IF recent >= 20 THEN
    INSERT INTO public.fraud_flags (user_id, kind, detail)
      VALUES (_user_id, 'rate_limit', '短時間に大量のポイント付与が発生しました');
    RETURN 0;
  END IF;

  granted := _points;
  IF r.daily_cap IS NOT NULL THEN
    SELECT coalesce(sum(delta),0) INTO today_total FROM public.point_events
      WHERE user_id = _user_id AND reason = _rule_key AND delta > 0 AND status = 'confirmed'
        AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo';
    granted := least(granted, greatest(r.daily_cap - today_total, 0));
  END IF;
  IF granted <= 0 THEN RETURN 0; END IF;

  BEGIN
    INSERT INTO public.point_events (user_id, delta, reason, label, source_type, source_id, dedupe_key)
      VALUES (_user_id, granted, _rule_key, _label, _source_type, _source_id, _dedupe_key);
  EXCEPTION WHEN unique_violation THEN
    RETURN 0; -- 二重報酬防止
  END;

  INSERT INTO public.point_wallets (user_id, balance, lifetime)
    VALUES (_user_id, granted, granted)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.point_wallets.balance + granted,
        lifetime = public.point_wallets.lifetime + granted,
        updated_at = now();

  PERFORM public.sync_achievements(_user_id);
  RETURN granted;
END $$;
REVOKE ALL ON FUNCTION public.award_points(uuid, text, integer, text, text, text, uuid) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_achievements(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.point_wallets%ROWTYPE; a public.achievement_defs%ROWTYPE; inv int; ok boolean;
BEGIN
  SELECT * INTO w FROM public.point_wallets WHERE user_id = _user_id;
  IF w.user_id IS NULL THEN RETURN; END IF;
  SELECT count(*) INTO inv FROM public.invite_referrals WHERE inviter_id = _user_id AND status = 'confirmed';
  FOR a IN SELECT * FROM public.achievement_defs LOOP
    ok := CASE a.kind
      WHEN 'lifetime' THEN w.lifetime >= a.threshold
      WHEN 'level' THEN public.point_level(w.lifetime) >= a.threshold
      WHEN 'invites' THEN inv >= a.threshold
      ELSE false END;
    IF ok AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = _user_id AND achievement_key = a.key) THEN
      INSERT INTO public.user_achievements (user_id, achievement_key) VALUES (_user_id, a.key)
        ON CONFLICT DO NOTHING;
      IF a.points > 0 THEN
        INSERT INTO public.point_events (user_id, delta, reason, label, source_type, dedupe_key)
          VALUES (_user_id, a.points, 'achievement', '実績：' || a.name, 'achievement', 'achievement:' || a.key)
          ON CONFLICT DO NOTHING;
        UPDATE public.point_wallets SET balance = balance + a.points, lifetime = lifetime + a.points, updated_at = now()
          WHERE user_id = _user_id;
      END IF;
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.sync_achievements(uuid) FROM anon, authenticated;

-- 活動記録（クライアントから呼ぶ唯一の入口。ポイント計算はサーバー側）
CREATE OR REPLACE FUNCTION public.record_activity(_kind text, _ref_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); r public.point_rules%ROWTYPE; dk text; got int; d date;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _kind NOT IN ('daily_login','message','post','comment','poll_vote','event_rsvp') THEN
    RAISE EXCEPTION 'unknown activity';
  END IF;
  SELECT * INTO r FROM public.point_rules WHERE key = _kind;
  d := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  dk := CASE WHEN _kind = 'daily_login' THEN 'daily_login:' || d::text
             WHEN _ref_id IS NOT NULL THEN _kind || ':' || _ref_id::text
             ELSE NULL END;
  got := public.award_points(me, _kind, r.points, r.label, dk, _kind, _ref_id);

  -- ミッション進捗
  INSERT INTO public.mission_progress (user_id, mission_key, day, progress)
    SELECT me, m.key, d, 1 FROM public.mission_defs m WHERE m.active AND m.rule_key = _kind
  ON CONFLICT (user_id, mission_key, day) DO UPDATE SET progress = public.mission_progress.progress + 1;

  PERFORM public.confirm_referral(me);
  RETURN coalesce(got, 0);
END $$;

CREATE OR REPLACE FUNCTION public.claim_mission(_key text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); m public.mission_defs%ROWTYPE; p public.mission_progress%ROWTYPE; d date;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO m FROM public.mission_defs WHERE key = _key AND active;
  IF m.key IS NULL THEN RAISE EXCEPTION 'ミッションが見つかりません'; END IF;
  d := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  SELECT * INTO p FROM public.mission_progress WHERE user_id = me AND mission_key = _key AND day = d;
  IF p.id IS NULL OR p.progress < m.target THEN RAISE EXCEPTION 'まだ達成していません'; END IF;
  IF p.claimed THEN RAISE EXCEPTION 'すでに受け取り済みです'; END IF;
  UPDATE public.mission_progress SET claimed = true WHERE id = p.id;
  RETURN public.award_points(me, 'mission', m.points, 'ミッション：' || m.name,
    'mission:' || _key || ':' || d::text, 'mission', NULL);
END $$;

CREATE OR REPLACE FUNCTION public.confirm_referral(_invitee uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ref public.invite_referrals%ROWTYPE; life int; dup int;
BEGIN
  SELECT * INTO ref FROM public.invite_referrals WHERE invitee_id = _invitee AND status = 'pending';
  IF ref.id IS NULL THEN RETURN; END IF;
  IF ref.inviter_id = ref.invitee_id THEN
    UPDATE public.invite_referrals SET status = 'rejected', note = '自己招待' WHERE id = ref.id;
    RETURN;
  END IF;
  SELECT coalesce(lifetime,0) INTO life FROM public.point_wallets WHERE user_id = _invitee;
  IF coalesce(life,0) < 50 THEN RETURN; END IF; -- 一定の活動まで報酬保留

  -- 短時間の大量招待は保留のうえ不正検知へ
  SELECT count(*) INTO dup FROM public.invite_referrals
    WHERE inviter_id = ref.inviter_id AND created_at > now() - interval '1 hour';
  IF dup > 10 THEN
    INSERT INTO public.fraud_flags (user_id, kind, detail)
      VALUES (ref.inviter_id, 'invite_abuse', '1時間に11件以上の招待が発生しました');
    RETURN;
  END IF;

  UPDATE public.invite_referrals SET status = 'confirmed', confirmed_at = now() WHERE id = ref.id;
  PERFORM public.award_points(ref.inviter_id, 'invite_confirmed', 100, '招待成立',
    'invite:' || ref.invitee_id::text, 'invite', ref.invitee_id);
  INSERT INTO public.notifications (user_id, actor_id, type, content, link)
    VALUES (ref.inviter_id, _invitee, 'invite_reward', '招待が成立し、ポイントを獲得しました', '/points');
END $$;

CREATE OR REPLACE FUNCTION public.purchase_shop_item(_item_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); it public.shop_items%ROWTYPE; w public.point_wallets%ROWTYPE; pid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO it FROM public.shop_items WHERE id = _item_id FOR UPDATE;
  IF it.id IS NULL THEN RAISE EXCEPTION '商品が見つかりません'; END IF;
  IF NOT it.published OR it.review_status <> 'approved' THEN RAISE EXCEPTION 'この商品は販売中ではありません'; END IF;
  IF it.starts_at IS NOT NULL AND it.starts_at > now() THEN RAISE EXCEPTION 'まだ販売開始前です'; END IF;
  IF it.ends_at IS NOT NULL AND it.ends_at <= now() THEN RAISE EXCEPTION '販売期間が終了しました'; END IF;
  IF it.stock IS NOT NULL AND it.sold >= it.stock THEN RAISE EXCEPTION '完売しました'; END IF;
  IF EXISTS (SELECT 1 FROM public.shop_purchases WHERE user_id = me AND item_id = _item_id) THEN
    RAISE EXCEPTION 'すでに交換済みです';
  END IF;

  SELECT * INTO w FROM public.point_wallets WHERE user_id = me FOR UPDATE;
  IF w.user_id IS NULL OR w.balance < it.price THEN RAISE EXCEPTION 'ポイントが足りません'; END IF;

  UPDATE public.point_wallets SET balance = balance - it.price, updated_at = now() WHERE user_id = me;
  INSERT INTO public.point_events (user_id, delta, reason, label, source_type, source_id, dedupe_key)
    VALUES (me, -it.price, 'purchase', 'Shop：' || it.name, 'shop', it.id, 'purchase:' || it.id::text || ':' || me::text);
  UPDATE public.shop_items SET sold = sold + 1 WHERE id = _item_id;
  INSERT INTO public.shop_purchases (user_id, item_id, price_paid) VALUES (me, _item_id, it.price)
    RETURNING id INTO pid;
  RETURN pid;
END $$;

CREATE OR REPLACE FUNCTION public.equip_shop_item(_item_id uuid, _equip boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); k text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT kind INTO k FROM public.shop_items WHERE id = _item_id;
  IF k IS NULL THEN RAISE EXCEPTION '商品が見つかりません'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shop_purchases WHERE user_id = me AND item_id = _item_id) THEN
    RAISE EXCEPTION '所持していません';
  END IF;
  IF _equip THEN
    UPDATE public.shop_purchases p SET equipped = false
      WHERE p.user_id = me AND p.equipped
        AND (SELECT kind FROM public.shop_items WHERE id = p.item_id) = k;
  END IF;
  UPDATE public.shop_purchases SET equipped = _equip WHERE user_id = me AND item_id = _item_id;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_points(_user_id uuid, _points integer, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF NOT public.has_role(me, 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _points <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  UPDATE public.point_wallets SET balance = greatest(balance - _points, 0), updated_at = now() WHERE user_id = _user_id;
  INSERT INTO public.point_events (user_id, delta, reason, label, source_type, status)
    VALUES (_user_id, -_points, 'revoke', coalesce(_reason,'不正ポイント取消'), 'admin', 'confirmed');
  INSERT INTO public.service_audit_logs (actor_id, action, target, detail)
    VALUES (me, 'revoke_points', _user_id::text, coalesce(_reason,'') || ' / ' || _points::text);
END $$;

-- ランキング
CREATE OR REPLACE FUNCTION public.points_leaderboard(_limit integer DEFAULT 50)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, lifetime integer, level integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.user_id, p.display_name, p.username, p.avatar_url, w.lifetime, public.point_level(w.lifetime)
  FROM public.point_wallets w JOIN public.profiles p ON p.id = w.user_id
  ORDER BY w.lifetime DESC, w.updated_at ASC
  LIMIT least(coalesce(_limit,50), 100)
$$;

-- 招待コード利用時に紹介記録を作る
CREATE OR REPLACE FUNCTION public.redeem_invite(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); inv public.invites%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO inv FROM public.invites WHERE code = _code;
  IF inv.id IS NULL THEN RAISE EXCEPTION '招待リンクが見つかりません'; END IF;
  IF inv.revoked THEN RAISE EXCEPTION 'この招待リンクは無効化されています'; END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at <= now() THEN RAISE EXCEPTION 'この招待リンクは期限切れです'; END IF;
  IF inv.max_uses IS NOT NULL AND inv.uses >= inv.max_uses THEN RAISE EXCEPTION 'この招待リンクは使用上限に達しています'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_members WHERE community_id = inv.community_id AND user_id = me) THEN
    INSERT INTO public.community_members (community_id, user_id, role) VALUES (inv.community_id, me, 'member');
    UPDATE public.invites SET uses = uses + 1 WHERE id = inv.id;
    IF inv.created_by IS NOT NULL AND inv.created_by <> me THEN
      INSERT INTO public.invite_referrals (inviter_id, invitee_id, community_id, invite_code)
        VALUES (inv.created_by, me, inv.community_id, inv.code)
      ON CONFLICT (invitee_id) DO NOTHING;
    END IF;
  END IF;
  RETURN inv.community_id;
END $$;

-- 初期商品
INSERT INTO public.shop_items (kind, name, description, price, published, review_status, payload, season) VALUES
  ('frame','ゴールドフレーム','プロフィールを金色の枠で飾ります',800,true,'approved','#f2b544',''),
  ('frame','ネオンフレーム','光る枠でプロフィールを目立たせます',600,true,'approved','#7c5cff',''),
  ('background','オーロラ背景','プロフィール背景をオーロラ柄に',1000,true,'approved','linear-gradient(135deg,#3f4bd8,#22d3ee)',''),
  ('title','はじまりの証','称号「はじまりの証」を獲得',300,true,'approved','はじまりの証',''),
  ('theme','ミッドナイトテーマ','アプリ全体を深い夜色に',1500,true,'approved','midnight',''),
  ('reaction','きらきらリアクション','特別なリアクションを使えます',500,true,'approved','✨','');
INSERT INTO public.shop_items (kind, name, description, price, published, review_status, payload, stock, season) VALUES
  ('limited','初期メンバーバッジ','人数限定の記念バッジ',1200,true,'approved','pioneer',100,'シーズン1');
