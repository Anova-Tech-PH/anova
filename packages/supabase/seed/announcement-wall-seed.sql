-- Announcement Wall seed data for Sample Conference
-- Depends on: Sample Conference event 76276299-9a72-4df5-9360-0c30909ee0cf

-- Wall configuration
INSERT INTO public.announcement_wall_config (
  id, event_id, enabled, rotation_speed, theme,
  show_event_overview, show_announcements, show_upcoming_sessions, show_sponsors, show_polls, show_custom_slides,
  session_lookahead_minutes
) VALUES (
  '00000000-0000-0000-0000-000000000901',
  '76276299-9a72-4df5-9360-0c30909ee0cf',
  true, 15, 'dark',
  true, true, true, true, false, true,
  120
) ON CONFLICT (event_id) DO NOTHING;

-- Custom slides
INSERT INTO public.announcement_wall_slides (id, event_id, title, body, bg_color, display_order, enabled) VALUES
  (
    '00000000-0000-0000-0000-000000000911',
    '76276299-9a72-4df5-9360-0c30909ee0cf',
    'WiFi Network',
    E'Network: SampleConf-Guest\nPassword: welcome2026',
    '#1e40af',
    0,
    true
  ) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.announcement_wall_slides (id, event_id, title, body, bg_color, display_order, enabled) VALUES
  (
    '00000000-0000-0000-0000-000000000912',
    '76276299-9a72-4df5-9360-0c30909ee0cf',
    'Lunch Break',
    E'Lunch is served in the Main Lobby\n12:30 PM - 1:30 PM',
    '#15803d',
    1,
    true
  ) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.announcement_wall_slides (id, event_id, title, body, bg_color, display_order, enabled) VALUES
  (
    '00000000-0000-0000-0000-000000000913',
    '76276299-9a72-4df5-9360-0c30909ee0cf',
    'After-Party Tonight!',
    E'Join us at the Rooftop Lounge\nStarts at 7:00 PM — All attendees welcome',
    '#7c3aed',
    2,
    true
  ) ON CONFLICT (id) DO NOTHING;
