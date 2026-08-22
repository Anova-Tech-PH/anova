-- Allow organizers (editors) to insert registrations for their events
CREATE POLICY "Organizers can insert registrations"
  ON public.registrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = registrations.event_id
        AND public.is_org_member(events.organization_id, 'editor')
    )
  );

-- Allow organizers (editors) to delete registrations for their events
CREATE POLICY "Organizers can delete registrations"
  ON public.registrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = registrations.event_id
        AND public.is_org_member(events.organization_id, 'editor')
    )
  );

-- Grant DELETE on registrations to authenticated role (needed for RLS delete policies to work)
GRANT DELETE ON public.registrations TO authenticated;
