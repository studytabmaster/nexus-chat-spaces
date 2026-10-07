CREATE TABLE public.signup_allowlist (
  email text PRIMARY KEY,
  note text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signup_allowlist ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.signup_allowlist TO authenticated;
GRANT ALL ON public.signup_allowlist TO service_role;
CREATE POLICY allow_admin_select ON public.signup_allowlist FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY allow_admin_insert ON public.signup_allowlist FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY allow_admin_delete ON public.signup_allowlist FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- grandfather existing users
INSERT INTO public.signup_allowlist (email, note)
SELECT lower(u.email), '既存ユーザー' FROM auth.users u JOIN public.profiles p ON p.id = u.id
WHERE u.email IS NOT NULL ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_access_allowed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.signup_allowlist WHERE email = lower(coalesce(auth.jwt()->>'email','')))
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_access_allowed() TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_profile()
 RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE me uuid := auth.uid(); p public.profiles; meta jsonb; base text; uname text; n int := 0;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.is_access_allowed() THEN RAISE EXCEPTION 'not_invited'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = me;
  IF p.id IS NOT NULL THEN RETURN p; END IF;
  meta := coalesce((auth.jwt() -> 'user_metadata'), '{}'::jsonb);
  base := lower(regexp_replace(coalesce(meta->>'username', meta->>'name', meta->>'full_name', split_part(auth.jwt()->>'email','@',1), 'user'), '[^a-z0-9_]', '', 'gi'));
  IF base = '' THEN base := 'user'; END IF;
  uname := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = uname) LOOP
    n := n + 1; uname := base || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (me, uname, coalesce(meta->>'display_name', meta->>'full_name', meta->>'name', uname), meta->>'avatar_url')
    RETURNING * INTO p;
  RETURN p;
END $function$;

CREATE OR REPLACE FUNCTION public.staff_users()
RETURNS TABLE(user_id uuid, role app_role) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id, role FROM public.user_roles WHERE role IN ('admin','moderator')
$$;
GRANT EXECUTE ON FUNCTION public.staff_users() TO authenticated;