ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.channel_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  favorite boolean NOT NULL DEFAULT false,
  muted boolean NOT NULL DEFAULT false,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_prefs TO authenticated;
GRANT ALL ON public.channel_prefs TO service_role;

ALTER TABLE public.channel_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own channel prefs select" ON public.channel_prefs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own channel prefs insert" ON public.channel_prefs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own channel prefs update" ON public.channel_prefs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own channel prefs delete" ON public.channel_prefs FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER channel_prefs_touch BEFORE UPDATE ON public.channel_prefs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.block_locked_channel_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE ch public.channels%ROWTYPE;
BEGIN
  SELECT * INTO ch FROM public.channels WHERE id = NEW.channel_id;
  IF ch.id IS NULL THEN RAISE EXCEPTION 'チャンネルが見つかりません'; END IF;
  IF (ch.locked OR ch.archived) AND NOT public.can_moderate(NEW.community_id, auth.uid()) THEN
    RAISE EXCEPTION 'このチャンネルは閲覧のみです';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS messages_block_locked ON public.messages;
CREATE TRIGGER messages_block_locked BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.block_locked_channel_message();