-- Fix conversations RLS: the SELECT policy blocked INSERT+RETURNING because
-- the new row has no conversation_members entry yet. Solution: use a
-- SECURITY DEFINER RPC function to create DM conversations atomically.

-- Also add missing UPDATE policy on conversations so message timestamps update.

-- Drop and recreate policies cleanly to avoid stale policy state
DROP POLICY IF EXISTS "Attendees can create conversations" ON conversations;
DROP POLICY IF EXISTS "Members can view their conversations" ON conversations;

ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their conversations"
  ON conversations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = conversations.id
      AND conversation_members.user_id = auth.uid()
  ));

CREATE POLICY "Attendees can create conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (public.is_event_attendee(event_id));

CREATE POLICY "Members can update their conversations"
  ON conversations FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = conversations.id
      AND conversation_members.user_id = auth.uid()
  ));

-- Add UPDATE grant for conversations (was missing)
GRANT UPDATE ON public.conversations TO authenticated;

-- RPC function to create DM conversations atomically.
-- Bypasses the INSERT+RETURNING RLS conflict by running as SECURITY DEFINER.
-- Deduplicates: returns existing DM if one already exists.
CREATE OR REPLACE FUNCTION public.create_dm_conversation(
  p_event_id uuid,
  p_other_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_conv_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_event_attendee(p_event_id) THEN
    RAISE EXCEPTION 'Not an attendee of this event';
  END IF;

  -- Check for existing DM between these two users for this event
  SELECT c.id INTO v_conv_id
  FROM conversations c
  JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = v_user_id
  JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = p_other_user_id
  WHERE c.event_id = p_event_id AND c.is_group = false
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (event_id, is_group)
  VALUES (p_event_id, false)
  RETURNING id INTO v_conv_id;

  -- Add both members
  INSERT INTO conversation_members (conversation_id, user_id)
  VALUES (v_conv_id, v_user_id), (v_conv_id, p_other_user_id);

  RETURN v_conv_id;
END;
$$;
