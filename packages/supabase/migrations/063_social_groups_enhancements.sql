-- Migration 063: Social Groups enhancements
-- Adds prompt field, membership, posts, and comments

-- =====================
-- 1. ADD PROMPT COLUMN
-- =====================

ALTER TABLE public.social_groups ADD COLUMN prompt TEXT;

-- =====================
-- 2. SOCIAL_GROUP_MEMBERS TABLE
-- =====================

CREATE TABLE public.social_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.social_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.social_group_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.social_group_members TO authenticated;

CREATE INDEX idx_social_group_members_group ON public.social_group_members(group_id);
CREATE INDEX idx_social_group_members_user ON public.social_group_members(user_id);

-- Org members can view all memberships for their events
CREATE POLICY "Org members can view group members"
  ON public.social_group_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM social_groups sg
    JOIN events e ON e.id = sg.event_id
    WHERE sg.id = social_group_members.group_id
    AND is_org_member(e.organization_id)
  ));

-- Authenticated users can join groups for published events
CREATE POLICY "Users can join visible groups"
  ON public.social_group_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM social_groups sg
      JOIN events e ON e.id = sg.event_id
      WHERE sg.id = social_group_members.group_id
      AND sg.is_visible = true
      AND e.status = 'published'
    )
  );

-- Users can leave groups they joined
CREATE POLICY "Users can leave groups"
  ON public.social_group_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =====================
-- 3. SOCIAL_GROUP_POSTS TABLE
-- =====================

CREATE TABLE public.social_group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.social_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_group_posts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_group_posts TO authenticated;

CREATE INDEX idx_social_group_posts_group ON public.social_group_posts(group_id);
CREATE INDEX idx_social_group_posts_user ON public.social_group_posts(user_id);

-- Org members can view all posts
CREATE POLICY "Org members can view group posts"
  ON public.social_group_posts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM social_groups sg
    JOIN events e ON e.id = sg.event_id
    WHERE sg.id = social_group_posts.group_id
    AND is_org_member(e.organization_id)
  ));

-- Members can view posts in groups they belong to
CREATE POLICY "Members can view group posts"
  ON public.social_group_posts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM social_group_members sgm
    WHERE sgm.group_id = social_group_posts.group_id
    AND sgm.user_id = auth.uid()
  ));

-- Members can create posts in groups they belong to
CREATE POLICY "Members can create group posts"
  ON public.social_group_posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM social_group_members sgm
      WHERE sgm.group_id = social_group_posts.group_id
      AND sgm.user_id = auth.uid()
    )
  );

-- Users can edit their own posts
CREATE POLICY "Users can edit own posts"
  ON public.social_group_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own posts, org members can delete any
CREATE POLICY "Users can delete own posts"
  ON public.social_group_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can delete group posts"
  ON public.social_group_posts FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM social_groups sg
    JOIN events e ON e.id = sg.event_id
    WHERE sg.id = social_group_posts.group_id
    AND is_org_member(e.organization_id)
  ));

-- =====================
-- 4. SOCIAL_GROUP_POST_COMMENTS TABLE
-- =====================

CREATE TABLE public.social_group_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_group_post_comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.social_group_post_comments TO authenticated;

CREATE INDEX idx_social_group_post_comments_post ON public.social_group_post_comments(post_id);

-- Org members can view all comments
CREATE POLICY "Org members can view post comments"
  ON public.social_group_post_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM social_group_posts sgp
    JOIN social_groups sg ON sg.id = sgp.group_id
    JOIN events e ON e.id = sg.event_id
    WHERE sgp.id = social_group_post_comments.post_id
    AND is_org_member(e.organization_id)
  ));

-- Group members can view comments
CREATE POLICY "Members can view post comments"
  ON public.social_group_post_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM social_group_posts sgp
    JOIN social_group_members sgm ON sgm.group_id = sgp.group_id
    WHERE sgp.id = social_group_post_comments.post_id
    AND sgm.user_id = auth.uid()
  ));

-- Group members can comment
CREATE POLICY "Members can comment on posts"
  ON public.social_group_post_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM social_group_posts sgp
      JOIN social_group_members sgm ON sgm.group_id = sgp.group_id
      WHERE sgp.id = social_group_post_comments.post_id
      AND sgm.user_id = auth.uid()
    )
  );

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.social_group_post_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Org members can delete any comments
CREATE POLICY "Org members can delete post comments"
  ON public.social_group_post_comments FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM social_group_posts sgp
    JOIN social_groups sg ON sg.id = sgp.group_id
    JOIN events e ON e.id = sg.event_id
    WHERE sgp.id = social_group_post_comments.post_id
    AND is_org_member(e.organization_id)
  ));
