-- =============================================================================
-- Documents & Videos
-- Event-level and session-level document/video attachments with download tracking
-- =============================================================================

CREATE TABLE public.event_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('file', 'video')),
  file_url TEXT,
  external_url TEXT,
  file_size BIGINT,
  file_type TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.document_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.event_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_documents_event ON public.event_documents(event_id);
CREATE INDEX idx_event_documents_session ON public.event_documents(session_id);
CREATE INDEX idx_document_downloads_doc ON public.document_downloads(document_id);

ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_downloads ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.event_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_documents TO authenticated;
GRANT ALL ON public.event_documents TO service_role;

GRANT SELECT, INSERT ON public.document_downloads TO authenticated;
GRANT ALL ON public.document_downloads TO service_role;

CREATE POLICY "Anyone can view documents for published events"
  ON public.event_documents FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = event_documents.event_id AND e.status = 'published'
  ));

CREATE POLICY "Authenticated can view documents"
  ON public.event_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = event_documents.event_id
    AND (e.status = 'published' OR is_org_member(e.organization_id))
  ));

CREATE POLICY "Org members can manage documents"
  ON public.event_documents FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = event_documents.event_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = event_documents.event_id AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Users can track own downloads"
  ON public.document_downloads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org members can view download stats"
  ON public.document_downloads FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM event_documents d
    JOIN events e ON e.id = d.event_id
    WHERE d.id = document_downloads.document_id
    AND is_org_member(e.organization_id)
  ));
