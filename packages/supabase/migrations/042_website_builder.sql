-- =============================================================================
-- Event Website Builder
-- Adds website_config JSONB to events for section-based page builder
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS website_config JSONB NOT NULL DEFAULT '{
    "enabled": false,
    "sections": [
      { "type": "hero", "visible": true, "content": { "headline": "", "subtitle": "" } },
      { "type": "about", "visible": true, "content": { "body": "" } },
      { "type": "speakers", "visible": true, "content": { "title": "Featured Speakers", "featured_only": true } },
      { "type": "agenda", "visible": true, "content": { "title": "Schedule" } },
      { "type": "sponsors", "visible": true, "content": { "title": "Our Sponsors" } },
      { "type": "venue", "visible": true, "content": { "title": "Venue & Logistics" } },
      { "type": "faq", "visible": true, "content": { "items": [] } },
      { "type": "cta", "visible": true, "content": { "text": "Register Now", "button_text": "Get Tickets" } }
    ],
    "theme": { "primary_color": "#0ea5e9", "font": "Inter" },
    "custom_css": ""
  }';
