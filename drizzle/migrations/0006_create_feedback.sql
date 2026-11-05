CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  page text NOT NULL,
  kind text NOT NULL DEFAULT 'idea',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_kind CHECK (kind IN ('bug','confusing','idea')),
  CONSTRAINT feedback_len CHECK (char_length(message) BETWEEN 1 AND 2000 AND char_length(page) <= 300)
);
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "read own feedback" ON public.feedback FOR SELECT TO authenticated USING (user_id = auth.uid());