-- Push notification tokens for mobile devices
CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, expo_push_token)
);

-- RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can insert own tokens" ON public.push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tokens" ON public.push_tokens
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON public.push_tokens
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Grant access
GRANT SELECT, INSERT, DELETE ON public.push_tokens TO authenticated;

-- Service role needs full access for Edge Functions
GRANT ALL ON public.push_tokens TO service_role;
