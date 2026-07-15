-- =============================================================================
-- Demo seed data: 1 organization, 3 events with speakers, sessions, tickets,
-- registrations, and breakout rooms so new users can see a fully populated app.
-- =============================================================================

-- Demo organization
INSERT INTO public.organizations (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Attendly Demo', 'attendly-demo');

-- ---------------------------------------------------------------------------
-- EVENT 1: Tech Summit 2026 (published, multi-day conference)
-- ---------------------------------------------------------------------------
INSERT INTO public.events (id, organization_id, title, slug, description, start_date, end_date, timezone, venue_name, venue_address, status, cover_image) VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'Tech Summit 2026',
   'tech-summit-2026',
   'The premier technology conference bringing together engineers, designers, and product leaders. Three days of keynotes, hands-on workshops, and networking with 500+ attendees from around the world.',
   '2026-09-15 09:00:00+00', '2026-09-17 18:00:00+00', 'America/Los_Angeles',
   'Moscone Center', '747 Howard St, San Francisco, CA 94103',
   'published', NULL);

-- Tracks
INSERT INTO public.tracks (id, event_id, name, color, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'Engineering', '#3B82F6', 0),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000010', 'Design', '#EC4899', 1),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000010', 'Product', '#10B981', 2);

-- Speakers
INSERT INTO public.speakers (id, event_id, name, title, company, bio) VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010',
   'Sarah Chen', 'VP of Engineering', 'Stripe',
   'Sarah leads platform engineering at Stripe. Previously at Google and Meta, she has 15 years of experience building distributed systems at scale.'),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000010',
   'Marcus Rivera', 'Head of Design', 'Linear',
   'Marcus shapes the design language at Linear. A design systems advocate, he has spoken at Config, Figma, and leading design conferences worldwide.'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000010',
   'Dr. Aisha Patel', 'AI Research Lead', 'DeepMind',
   'Aisha leads the responsible AI team at DeepMind. Her research on AI alignment and safety has been published in Nature and Science.'),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000010',
   'James Thornton', 'CTO', 'Vercel',
   'James oversees the technical vision at Vercel. A core contributor to Next.js, he is passionate about developer experience and edge computing.'),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000010',
   'Elena Volkov', 'Principal PM', 'Notion',
   'Elena drives product strategy at Notion. She specializes in building tools that empower teams to do their best work.');

-- Sessions — Day 1
INSERT INTO public.sessions (id, event_id, track_id, title, description, type, start_time, end_time, location) VALUES
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000010', NULL,
   'Opening Keynote: The Future of Software', 'A look at where the industry is headed — from AI-native development to the next generation of developer tools.',
   'keynote', '2026-09-15 09:30:00+00', '2026-09-15 10:30:00+00', 'Main Hall'),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000010', NULL,
   'Morning Break', 'Coffee and pastries in the lobby.',
   'break', '2026-09-15 10:30:00+00', '2026-09-15 11:00:00+00', 'Lobby'),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000020',
   'Building Resilient Distributed Systems', 'Practical patterns for building systems that gracefully handle failure at scale. Covers circuit breakers, bulkheads, and chaos engineering.',
   'talk', '2026-09-15 11:00:00+00', '2026-09-15 11:45:00+00', 'Room A'),
  ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000021',
   'Design Systems That Scale', 'How Linear built a design system used by 50+ engineers. Lessons on tokens, component APIs, and cross-platform consistency.',
   'talk', '2026-09-15 11:00:00+00', '2026-09-15 11:45:00+00', 'Room B'),
  ('00000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000022',
   'From 0 to 1: Finding Product-Market Fit', 'A framework for validating ideas, running experiments, and knowing when you have found PMF.',
   'talk', '2026-09-15 11:00:00+00', '2026-09-15 11:45:00+00', 'Room C'),
  -- Day 1 afternoon
  ('00000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000020',
   'Workshop: Hands-on with Edge Computing', 'Deploy your first edge function and learn to think about compute at the edge. Bring your laptop!',
   'workshop', '2026-09-15 13:00:00+00', '2026-09-15 15:00:00+00', 'Workshop Room 1'),
  ('00000000-0000-0000-0000-000000000046', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000020',
   'AI in Production: Lessons Learned', 'Real-world challenges of deploying ML models — from data pipelines to monitoring, latency budgets to cost management.',
   'talk', '2026-09-15 15:30:00+00', '2026-09-15 16:15:00+00', 'Room A'),
  -- Day 2
  ('00000000-0000-0000-0000-000000000047', '00000000-0000-0000-0000-000000000010', NULL,
   'Panel: Responsible AI', 'Industry leaders discuss the ethical implications of AI, governance frameworks, and building trust with users.',
   'panel', '2026-09-16 10:00:00+00', '2026-09-16 11:00:00+00', 'Main Hall'),
  ('00000000-0000-0000-0000-000000000048', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000021',
   'Workshop: Figma to Code Pipeline', 'Bridge the gap between design and engineering with modern tooling. Covers design tokens, code generation, and review workflows.',
   'workshop', '2026-09-16 13:00:00+00', '2026-09-16 15:00:00+00', 'Workshop Room 2');

-- Link speakers to sessions
INSERT INTO public.session_speakers (session_id, speaker_id) VALUES
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000033'),  -- Keynote: James
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000030'),  -- Distributed Systems: Sarah
  ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000031'),  -- Design Systems: Marcus
  ('00000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000034'),  -- PMF: Elena
  ('00000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000033'),  -- Edge Workshop: James
  ('00000000-0000-0000-0000-000000000046', '00000000-0000-0000-0000-000000000032'),  -- AI Production: Aisha
  ('00000000-0000-0000-0000-000000000047', '00000000-0000-0000-0000-000000000032'),  -- Panel: Aisha
  ('00000000-0000-0000-0000-000000000047', '00000000-0000-0000-0000-000000000030'),  -- Panel: Sarah
  ('00000000-0000-0000-0000-000000000048', '00000000-0000-0000-0000-000000000031'); -- Figma Workshop: Marcus

-- Ticket types
INSERT INTO public.ticket_types (id, event_id, name, description, type, price, quantity, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000010',
   'Early Bird', 'Limited early bird pricing — includes all sessions and workshops', 'paid', 299.00, 100, 0),
  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000010',
   'General Admission', 'Full access to all keynotes, talks, and panels', 'paid', 499.00, 400, 1),
  ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000010',
   'Student Pass', 'Discounted access for students with valid .edu email', 'paid', 99.00, 50, 2);

-- Sample registrations (guest — no user_id)
INSERT INTO public.registrations (event_id, ticket_type_id, email, name, qr_code, status) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000050', 'alice@example.com', 'Alice Johnson', 'demo-qr-001', 'confirmed'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000050', 'bob@example.com', 'Bob Martinez', 'demo-qr-002', 'confirmed'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000051', 'carol@example.com', 'Carol Williams', 'demo-qr-003', 'checked_in'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000051', 'dave@example.com', 'Dave Kim', 'demo-qr-004', 'confirmed'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000052', 'emily@university.edu', 'Emily Nguyen', 'demo-qr-005', 'confirmed'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000051', 'frank@example.com', 'Frank Otieno', 'demo-qr-006', 'cancelled'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000051', 'grace@example.com', 'Grace Lee', 'demo-qr-007', 'confirmed'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000050', 'henry@example.com', 'Henry Zhao', 'demo-qr-008', 'checked_in');

-- Breakout rooms
INSERT INTO public.breakout_rooms (id, event_id, session_id, title, description, facilitator_name, location, max_capacity, starts_at, ends_at, status) VALUES
  ('00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000010', NULL,
   'Open Networking Lounge', 'Casual space to meet fellow attendees, grab coffee, and exchange ideas. Drop in anytime!',
   NULL, 'Lobby Lounge', NULL,
   '2026-09-15 09:00:00+00', '2026-09-15 18:00:00+00', 'open'),
  ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000046',
   'AI Ethics Deep Dive', 'Continue the conversation from the AI in Production talk. Discuss bias detection, model transparency, and responsible deployment.',
   'Dr. Aisha Patel', 'Room D', 25,
   '2026-09-15 16:30:00+00', '2026-09-15 17:30:00+00', 'open'),
  ('00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000010', NULL,
   'Startup Founders Meetup', 'Are you building something? Meet other founders, share challenges, and find potential collaborators or co-founders.',
   'Elena Volkov', 'Room E', 30,
   '2026-09-16 12:00:00+00', '2026-09-16 13:00:00+00', 'open');

-- ---------------------------------------------------------------------------
-- EVENT 2: Design Conf 2026 (published, single-day design event)
-- ---------------------------------------------------------------------------
INSERT INTO public.events (id, organization_id, title, slug, description, start_date, end_date, timezone, venue_name, venue_address, status) VALUES
  ('00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000001',
   'Design Conf 2026',
   'design-conf-2026',
   'A single-day deep dive into modern product design. From design systems to user research, accessibility to motion design — learn from practitioners shaping the best digital products.',
   '2026-10-22 09:00:00+00', '2026-10-22 18:00:00+00', 'America/New_York',
   'The Shed', '545 W 30th St, New York, NY 10001',
   'published');

-- Speakers
INSERT INTO public.speakers (id, event_id, name, title, company, bio) VALUES
  ('00000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000011',
   'Lina Morales', 'Design Director', 'Figma',
   'Lina leads the design team behind FigJam. She is passionate about collaborative tools and making design accessible to everyone.'),
  ('00000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000011',
   'Tomasz Kowalski', 'Accessibility Lead', 'Apple',
   'Tomasz ensures Apple products work for everyone. He has two decades of experience in inclusive design and assistive technology.');

-- Sessions
INSERT INTO public.sessions (id, event_id, title, description, type, start_time, end_time, location) VALUES
  ('00000000-0000-0000-0000-000000000049', '00000000-0000-0000-0000-000000000011',
   'Keynote: Design in the Age of AI', 'How AI is changing the designer role — and why human judgment matters more than ever.',
   'keynote', '2026-10-22 09:30:00+00', '2026-10-22 10:30:00+00', 'Main Stage'),
  ('00000000-0000-0000-0000-00000000004a', '00000000-0000-0000-0000-000000000011',
   'Accessibility Beyond Compliance', 'Moving past WCAG checklists to truly inclusive design. Case studies from Apple and beyond.',
   'talk', '2026-10-22 11:00:00+00', '2026-10-22 11:45:00+00', 'Stage A'),
  ('00000000-0000-0000-0000-00000000004b', '00000000-0000-0000-0000-000000000011',
   'Workshop: Motion Design Fundamentals', 'Learn to use motion purposefully — guiding attention, providing feedback, and creating delight without distraction.',
   'workshop', '2026-10-22 13:00:00+00', '2026-10-22 15:00:00+00', 'Workshop Room'),
  ('00000000-0000-0000-0000-00000000004c', '00000000-0000-0000-0000-000000000011',
   'Panel: The Future of Design Tools', 'Figma, Framer, and new challengers — where are design tools headed?',
   'panel', '2026-10-22 15:30:00+00', '2026-10-22 16:30:00+00', 'Main Stage');

INSERT INTO public.session_speakers (session_id, speaker_id) VALUES
  ('00000000-0000-0000-0000-000000000049', '00000000-0000-0000-0000-000000000035'),
  ('00000000-0000-0000-0000-00000000004a', '00000000-0000-0000-0000-000000000036'),
  ('00000000-0000-0000-0000-00000000004b', '00000000-0000-0000-0000-000000000035'),
  ('00000000-0000-0000-0000-00000000004c', '00000000-0000-0000-0000-000000000035'),
  ('00000000-0000-0000-0000-00000000004c', '00000000-0000-0000-0000-000000000036');

-- Tickets
INSERT INTO public.ticket_types (id, event_id, name, description, type, price, quantity, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000011',
   'General', 'Full day access to all talks, panels, and workshops', 'paid', 199.00, 200, 0),
  ('00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000011',
   'Community', 'Free tickets for open-source contributors and community members', 'free', 0, 30, 1);

INSERT INTO public.registrations (event_id, ticket_type_id, email, name, qr_code, status) VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000053', 'maya@example.com', 'Maya Thompson', 'demo-qr-020', 'confirmed'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000053', 'raj@example.com', 'Raj Kapoor', 'demo-qr-021', 'confirmed'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000054', 'sophie@example.com', 'Sophie Anderson', 'demo-qr-022', 'confirmed');

-- Breakout room
INSERT INTO public.breakout_rooms (id, event_id, title, description, facilitator_name, location, max_capacity, starts_at, ends_at, status) VALUES
  ('00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000011',
   'Design Portfolio Reviews', 'Get feedback on your portfolio from senior designers. Bring your laptop or phone with your work ready to show.',
   'Lina Morales', 'Breakout Area', 15,
   '2026-10-22 16:45:00+00', '2026-10-22 17:45:00+00', 'open');

-- ---------------------------------------------------------------------------
-- EVENT 3: Startup Weekend (draft — shows organizer-only event in progress)
-- ---------------------------------------------------------------------------
INSERT INTO public.events (id, organization_id, title, slug, description, start_date, end_date, timezone, is_virtual, virtual_url, status) VALUES
  ('00000000-0000-0000-0000-000000000012',
   '00000000-0000-0000-0000-000000000001',
   'Remote Startup Weekend',
   'remote-startup-weekend',
   'A 48-hour virtual hackathon where teams form, build, and pitch startup ideas. Open to developers, designers, and business minds. Prizes for top 3 teams!',
   '2026-11-07 17:00:00+00', '2026-11-09 21:00:00+00', 'UTC',
   true, 'https://zoom.us/j/example',
   'draft');

INSERT INTO public.ticket_types (id, event_id, name, description, type, price, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000055', '00000000-0000-0000-0000-000000000012',
   'Participant', 'Includes access to all sessions, mentoring, and pitch night', 'free', 0, 0);
