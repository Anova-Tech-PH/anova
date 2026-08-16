-- Seed polls for each answer type (beyond multiple_choice)
-- Depends on: Sample Conference event 76276299-9a72-4df5-9360-0c30909ee0cf
-- Uses existing user 29f2a323-b0e7-4f4e-a084-919d47b97c1c

-- Star rating poll
INSERT INTO public.live_polls (event_id, created_by, question, options, status, answer_type, show_results)
VALUES (
  '76276299-9a72-4df5-9360-0c30909ee0cf',
  '29f2a323-b0e7-4f4e-a084-919d47b97c1c',
  'How would you rate this event overall?',
  '[]',
  'open',
  'star_rating',
  true
) ON CONFLICT DO NOTHING;

-- Short answer poll
INSERT INTO public.live_polls (event_id, created_by, question, options, status, answer_type, show_results)
VALUES (
  '76276299-9a72-4df5-9360-0c30909ee0cf',
  '29f2a323-b0e7-4f4e-a084-919d47b97c1c',
  'What topic would you like covered at the next event?',
  '[]',
  'open',
  'short_answer',
  true
) ON CONFLICT DO NOTHING;

-- Word cloud poll
INSERT INTO public.live_polls (event_id, created_by, question, options, status, answer_type, show_results)
VALUES (
  '76276299-9a72-4df5-9360-0c30909ee0cf',
  '29f2a323-b0e7-4f4e-a084-919d47b97c1c',
  'Describe this event in one word',
  '[]',
  'open',
  'word_cloud',
  true
) ON CONFLICT DO NOTHING;

-- Checkbox poll
INSERT INTO public.live_polls (event_id, created_by, question, options, status, answer_type, show_results)
VALUES (
  '76276299-9a72-4df5-9360-0c30909ee0cf',
  '29f2a323-b0e7-4f4e-a084-919d47b97c1c',
  'Which sessions did you attend? (select all that apply)',
  '[{"id": "a", "text": "Opening Keynote"}, {"id": "b", "text": "Workshop A"}, {"id": "c", "text": "Workshop B"}, {"id": "d", "text": "Closing Panel"}]',
  'open',
  'checkbox',
  true
) ON CONFLICT DO NOTHING;
