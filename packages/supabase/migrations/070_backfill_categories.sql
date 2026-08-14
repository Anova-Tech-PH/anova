-- =====================
-- Migration 070: Backfill attendee categories from existing registration data
-- =====================

-- 1. Create attendee_categories from distinct non-null registrations.category per event
INSERT INTO public.attendee_categories (event_id, name, color, sort_order)
SELECT DISTINCT r.event_id, r.category, 'blue', 0
FROM public.registrations r
WHERE r.category IS NOT NULL AND r.category != ''
ON CONFLICT DO NOTHING;

-- 2. Backfill category_id on registrations
UPDATE public.registrations r
SET category_id = ac.id
FROM public.attendee_categories ac
WHERE r.event_id = ac.event_id
  AND r.category = ac.name
  AND r.category_id IS NULL;

-- 3. Insert default all-to-all visibility matrix
INSERT INTO public.category_visibility (viewer_category_id, visible_category_id)
SELECT a.id, b.id
FROM public.attendee_categories a
JOIN public.attendee_categories b ON a.event_id = b.event_id
ON CONFLICT DO NOTHING;
