-- =============================================================================
-- Migration 085: Activity Stream
-- Add activity_stream_enabled flag to announcement_wall_config
-- =============================================================================

ALTER TABLE public.announcement_wall_config
  ADD COLUMN activity_stream_enabled BOOLEAN NOT NULL DEFAULT false;
