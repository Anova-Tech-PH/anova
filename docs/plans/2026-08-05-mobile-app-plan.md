# Evenstry Mobile App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Expo React Native mobile app for attendees (iOS + Android) sharing business logic with the existing web app via a new `@attendly/supabase-client` package, plus server-side push notifications via Supabase Edge Functions.

**Architecture:** Extract all Supabase queries/mutations from `apps/attendee` into `packages/supabase-client`. Both the web app and the new Expo mobile app import from this shared package, each providing their own Supabase client instance (SSR-cookie-based for web, AsyncStorage-based for mobile). Push notifications are triggered server-side via Supabase Database Webhooks calling an Edge Function that uses the Expo Push API.

**Tech Stack:** Expo SDK 56 (managed), Expo Router, `@supabase/supabase-js`, `@tanstack/react-query`, `expo-notifications`, `expo-secure-store`, AsyncStorage

---

## Task 1: Create `@attendly/supabase-client` Package

**Files:**
- Create: `packages/supabase-client/package.json`
- Create: `packages/supabase-client/tsconfig.json`
- Create: `packages/supabase-client/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@attendly/supabase-client",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    "./queries/*": "./src/queries/*.ts",
    "./mutations/*": "./src/mutations/*.ts",
    "./realtime/*": "./src/realtime/*.ts"
  },
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.110.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 3: Create barrel export at `src/index.ts`**

```ts
export * from "./queries/rooms";
export * from "./queries/events";
export * from "./queries/people";
export * from "./queries/profile";
export * from "./queries/social";
export * from "./queries/messaging";
export * from "./mutations/rooms";
export * from "./mutations/connections";
export * from "./mutations/profile";
export * from "./mutations/messaging";
export * from "./mutations/social";
```

**Step 4: Run `pnpm install` from monorepo root**

Run: `cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && pnpm install`

**Step 5: Commit**

```bash
git add packages/supabase-client/
git commit -m "feat: scaffold @attendly/supabase-client package"
```

---

## Task 2: Extract Room Queries & Mutations into Shared Package

**Files:**
- Create: `packages/supabase-client/src/queries/rooms.ts`
- Create: `packages/supabase-client/src/mutations/rooms.ts`
- Modify: `apps/attendee/src/features/breakout-rooms/queries.ts`
- Modify: `apps/attendee/src/features/breakout-rooms/actions.ts`

**Step 1: Create `packages/supabase-client/src/queries/rooms.ts`**

Extract query logic from `apps/attendee/src/features/breakout-rooms/queries.ts`. Every function takes a `SupabaseClient` as the first argument instead of creating its own client.

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getRoomsByEvent(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("breakout_rooms")
    .select(`
      *,
      sessions(id, title),
      breakout_room_participants(id, user_id, joined_at)
    `)
    .eq("event_id", eventId)
    .order("starts_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getRoomById(client: SupabaseClient, roomId: string) {
  const { data, error } = await client
    .from("breakout_rooms")
    .select(`
      *,
      sessions(id, title),
      breakout_room_participants(id, user_id, joined_at)
    `)
    .eq("id", roomId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getMyRooms(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("breakout_room_participants")
    .select(`
      room_id,
      joined_at,
      breakout_rooms(*)
    `)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return data;
}
```

**Step 2: Create `packages/supabase-client/src/mutations/rooms.ts`**

Extract mutation logic (without `revalidatePath` — that stays in the web app's server actions).

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function joinRoomMutation(client: SupabaseClient, roomId: string, userId: string) {
  // Check room exists and is open
  const { data: room } = await client
    .from("breakout_rooms")
    .select("id, max_capacity, status, event_id")
    .eq("id", roomId)
    .single();

  if (!room) throw new Error("Room not found");
  if (room.status === "closed") throw new Error("Room is closed");

  // Check capacity
  if (room.max_capacity) {
    const { count } = await client
      .from("breakout_room_participants")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId);

    if (count !== null && count >= room.max_capacity) {
      throw new Error("Room is full");
    }
  }

  const { error } = await client
    .from("breakout_room_participants")
    .insert({ room_id: roomId, user_id: userId });

  if (error) {
    if (error.code === "23505") throw new Error("Already joined this room");
    throw new Error(error.message);
  }

  // Auto-update status to full if at capacity
  if (room.max_capacity) {
    const { count } = await client
      .from("breakout_room_participants")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId);

    if (count !== null && count >= room.max_capacity) {
      await client
        .from("breakout_rooms")
        .update({ status: "full", updated_at: new Date().toISOString() })
        .eq("id", roomId);
    }
  }

  return room;
}

export async function leaveRoomMutation(client: SupabaseClient, roomId: string, userId: string) {
  const { data: room } = await client
    .from("breakout_rooms")
    .select("id, event_id, status, max_capacity")
    .eq("id", roomId)
    .single();

  if (!room) throw new Error("Room not found");

  const { error } = await client
    .from("breakout_room_participants")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  // If room was full, reopen it
  if (room.status === "full") {
    await client
      .from("breakout_rooms")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", roomId);
  }

  return room;
}
```

**Step 3: Update web app `queries.ts` to use shared package**

Modify `apps/attendee/src/features/breakout-rooms/queries.ts`:

```ts
import { createClient } from "@attendly/ui/supabase/server";
import { getRoomsByEvent as _getRoomsByEvent, getRoomById as _getRoomById, getMyRooms as _getMyRooms } from "@attendly/supabase-client/queries/rooms";

export async function getRoomsByEvent(eventId: string) {
  const supabase = await createClient();
  return _getRoomsByEvent(supabase, eventId);
}

export async function getRoomById(roomId: string) {
  const supabase = await createClient();
  return _getRoomById(supabase, roomId);
}

export async function getMyRooms(userId: string) {
  const supabase = await createClient();
  return _getMyRooms(supabase, userId);
}
```

**Step 4: Update web app `actions.ts` to use shared mutations for join/leave**

Modify `apps/attendee/src/features/breakout-rooms/actions.ts` — replace inline join/leave logic with shared functions. Keep `revalidatePath` calls in the server action wrapper. Keep `createRoom`, `updateRoom`, `deleteRoom` as-is (organizer-only, not needed in mobile yet).

```ts
// In joinRoom action, replace inline logic with:
import { joinRoomMutation, leaveRoomMutation } from "@attendly/supabase-client/mutations/rooms";

export async function joinRoom(roomId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const room = await joinRoomMutation(supabase, roomId, user.id);
  revalidatePath(`/events/${room.event_id}/rooms`);
  revalidatePath("/rooms");
}

export async function leaveRoom(roomId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const room = await leaveRoomMutation(supabase, roomId, user.id);
  revalidatePath(`/events/${room.event_id}/rooms`);
  revalidatePath("/rooms");
}
```

**Step 5: Verify web app still works**

Run: `cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && pnpm --filter @attendly/attendee dev`

Open `http://localhost:3001/rooms` and verify rooms page loads correctly.

**Step 6: Commit**

```bash
git add packages/supabase-client/src/queries/rooms.ts packages/supabase-client/src/mutations/rooms.ts apps/attendee/src/features/breakout-rooms/
git commit -m "refactor: extract room queries/mutations to @attendly/supabase-client"
```

---

## Task 3: Extract Profile, People & Connections into Shared Package

**Files:**
- Create: `packages/supabase-client/src/queries/profile.ts`
- Create: `packages/supabase-client/src/queries/people.ts`
- Create: `packages/supabase-client/src/mutations/profile.ts`
- Create: `packages/supabase-client/src/mutations/connections.ts`
- Modify: `apps/attendee/src/features/profile/queries.ts`
- Modify: `apps/attendee/src/features/profile/actions.ts`
- Modify: `apps/attendee/src/features/connections/actions.ts`

**Step 1: Create `packages/supabase-client/src/queries/profile.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
```

**Step 2: Create `packages/supabase-client/src/queries/people.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getEventAttendees(client: SupabaseClient, eventId: string) {
  const { data: registrations } = await client
    .from("registrations")
    .select("user_id")
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"])
    .not("user_id", "is", null);

  const userIds = registrations?.map((r) => r.user_id).filter(Boolean) as string[] ?? [];
  if (userIds.length === 0) return [];

  const { data: profiles } = await client
    .from("profiles")
    .select("*")
    .in("id", userIds)
    .order("full_name");

  return profiles ?? [];
}

export async function getConnectionsForEvent(client: SupabaseClient, userId: string, eventId: string) {
  const { data: sent } = await client
    .from("connections")
    .select("id, receiver_id, status")
    .eq("requester_id", userId)
    .eq("event_id", eventId);

  const { data: received } = await client
    .from("connections")
    .select("id, requester_id, status")
    .eq("receiver_id", userId)
    .eq("event_id", eventId);

  return { sent: sent ?? [], received: received ?? [] };
}
```

**Step 3: Create `packages/supabase-client/src/mutations/profile.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function updateProfileMutation(
  client: SupabaseClient,
  userId: string,
  data: {
    full_name: string;
    avatar_url?: string;
    bio?: string;
    company?: string;
    job_title?: string;
    interests?: string[];
    looking_for?: string[];
    linkedin_url?: string;
    twitter_handle?: string;
  }
) {
  const { error } = await client
    .from("profiles")
    .update({
      full_name: data.full_name,
      avatar_url: data.avatar_url || null,
      bio: data.bio || null,
      company: data.company || null,
      job_title: data.job_title || null,
      interests: data.interests ?? [],
      looking_for: data.looking_for ?? [],
      linkedin_url: data.linkedin_url || null,
      twitter_handle: data.twitter_handle || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}
```

**Step 4: Create `packages/supabase-client/src/mutations/connections.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function sendConnectionRequestMutation(
  client: SupabaseClient,
  requesterId: string,
  receiverId: string,
  eventId: string
) {
  const { error } = await client
    .from("connections")
    .insert({
      requester_id: requesterId,
      receiver_id: receiverId,
      event_id: eventId,
      status: "pending",
    });

  if (error) {
    if (error.code === "23505") throw new Error("Connection request already sent");
    throw new Error(error.message);
  }
}

export async function respondToConnectionMutation(
  client: SupabaseClient,
  connectionId: string,
  status: "accepted" | "declined"
) {
  const { error } = await client
    .from("connections")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", connectionId);

  if (error) throw new Error(error.message);
}
```

**Step 5: Update web app files to use shared package**

Update `apps/attendee/src/features/profile/queries.ts`, `apps/attendee/src/features/profile/actions.ts`, and `apps/attendee/src/features/connections/actions.ts` to import from `@attendly/supabase-client` — same wrapper pattern as Task 2 (create client, call shared function, revalidate).

**Step 6: Verify web app still works**

Run: `pnpm --filter @attendly/attendee dev`

Check `/people` and `/profile` pages.

**Step 7: Commit**

```bash
git add packages/supabase-client/src/queries/ packages/supabase-client/src/mutations/ apps/attendee/src/features/profile/ apps/attendee/src/features/connections/
git commit -m "refactor: extract profile, people, connections to @attendly/supabase-client"
```

---

## Task 4: Extract Messaging Queries & Mutations into Shared Package

**Files:**
- Create: `packages/supabase-client/src/queries/messaging.ts`
- Create: `packages/supabase-client/src/mutations/messaging.ts`
- Modify: `apps/attendee/src/features/messaging/queries.ts`
- Modify: `apps/attendee/src/features/messaging/actions.ts`

**Step 1: Create `packages/supabase-client/src/queries/messaging.ts`**

Extract `getConversations` and `getMessages` — accept `client` and `userId` as params instead of calling `auth.getUser()` internally.

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getConversations(client: SupabaseClient, userId: string) {
  const { data: memberships } = await client
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) return [];

  const convIds = memberships.map((m) => m.conversation_id);
  const lastReadMap: Record<string, string | null> = {};
  for (const m of memberships) {
    lastReadMap[m.conversation_id] = m.last_read_at;
  }

  const { data: conversations } = await client
    .from("conversations")
    .select(`*, conversation_members(user_id)`)
    .in("id", convIds)
    .order("updated_at", { ascending: false });

  if (!conversations) return [];

  const allMemberIds = new Set<string>();
  for (const conv of conversations) {
    for (const m of (conv.conversation_members as any[])) {
      allMemberIds.add(m.user_id);
    }
  }

  const { data: profiles } = await client
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", Array.from(allMemberIds));

  const profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
  }

  const result = [];
  for (const conv of conversations) {
    const { data: lastMsg } = await client
      .from("messages")
      .select("content, created_at, sender_id")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const lastRead = lastReadMap[conv.id];
    let unreadCount = 0;
    if (lastRead) {
      const { count } = await client
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .neq("sender_id", userId)
        .gt("created_at", lastRead);
      unreadCount = count ?? 0;
    }

    const otherMembers = (conv.conversation_members as any[])
      .filter((m: any) => m.user_id !== userId);
    const otherProfile = otherMembers[0] ? profileMap[otherMembers[0].user_id] : null;

    result.push({
      ...conv,
      last_message: lastMsg,
      unread_count: unreadCount,
      display_name: conv.is_group
        ? conv.name ?? "Group Chat"
        : otherProfile?.full_name ?? "Unknown",
      display_avatar: conv.is_group
        ? null
        : otherProfile?.avatar_url ?? null,
    });
  }

  return result;
}

export async function getMessages(client: SupabaseClient, conversationId: string) {
  const { data: messages, error } = await client
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);
  if (!messages || messages.length === 0) return [];

  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const { data: profiles } = await client
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", senderIds);

  const profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
  }

  return messages.map((msg) => ({
    ...msg,
    profiles: profileMap[msg.sender_id] ?? null,
  }));
}
```

**Step 2: Create `packages/supabase-client/src/mutations/messaging.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function sendMessageMutation(
  client: SupabaseClient,
  userId: string,
  data: { conversation_id: string; content: string; image_url?: string }
) {
  const { data: message, error } = await client
    .from("messages")
    .insert({
      conversation_id: data.conversation_id,
      sender_id: userId,
      content: data.content,
      image_url: data.image_url || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const { data: profile } = await client
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .single();

  await client
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", data.conversation_id);

  await client
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", data.conversation_id)
    .eq("user_id", userId);

  return { ...message, profiles: profile };
}

export async function markConversationReadMutation(
  client: SupabaseClient,
  conversationId: string,
  userId: string
) {
  await client
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function createDmConversationMutation(
  client: SupabaseClient,
  eventId: string,
  otherUserId: string
) {
  const { data: convId, error } = await client.rpc("create_dm_conversation", {
    p_event_id: eventId,
    p_other_user_id: otherUserId,
  });

  if (error) throw new Error(error.message);
  return { id: convId as string };
}
```

**Step 3: Update web app files to use shared package**

Same wrapper pattern. Update `apps/attendee/src/features/messaging/queries.ts` and `actions.ts`.

**Step 4: Verify web app messaging still works**

**Step 5: Commit**

```bash
git add packages/supabase-client/src/queries/messaging.ts packages/supabase-client/src/mutations/messaging.ts apps/attendee/src/features/messaging/
git commit -m "refactor: extract messaging queries/mutations to @attendly/supabase-client"
```

---

## Task 5: Extract Social/Feed Queries & Mutations into Shared Package

**Files:**
- Create: `packages/supabase-client/src/queries/social.ts`
- Create: `packages/supabase-client/src/mutations/social.ts`
- Modify: `apps/attendee/src/features/social/queries.ts`
- Modify: `apps/attendee/src/features/social/actions.ts`

**Step 1: Create `packages/supabase-client/src/queries/social.ts`**

Extract `getPostsByEvent` — accept `client` and `userId` params.

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPostsByEvent(client: SupabaseClient, eventId: string, userId?: string) {
  const { data: posts, error } = await client
    .from("posts")
    .select(`*, comments(id, content, created_at, author_id)`)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  if (!posts || posts.length === 0) return [];

  const authorIds = new Set<string>();
  for (const post of posts) {
    authorIds.add(post.author_id);
    for (const comment of post.comments ?? []) {
      authorIds.add((comment as any).author_id);
    }
  }

  const { data: profiles } = await client
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", Array.from(authorIds));

  const profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
  }

  let likedPostIds: Set<string> = new Set();
  if (userId) {
    const { data: likes } = await client
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId);
    likedPostIds = new Set(likes?.map((l) => l.post_id) ?? []);
  }

  const postIds = posts.filter((p) => p.type === "poll").map((p) => p.id);
  let pollVotes: Record<string, Record<number, number>> = {};
  let userVotes: Record<string, number> = {};

  if (postIds.length > 0) {
    const { data: votes } = await client
      .from("poll_votes")
      .select("post_id, option_index, user_id")
      .in("post_id", postIds);

    for (const v of votes ?? []) {
      pollVotes[v.post_id] ??= {};
      pollVotes[v.post_id][v.option_index] = (pollVotes[v.post_id][v.option_index] ?? 0) + 1;
      if (v.user_id === userId) {
        userVotes[v.post_id] = v.option_index;
      }
    }
  }

  return posts.map((post) => ({
    ...post,
    profiles: profileMap[post.author_id] ?? null,
    comments: (post.comments ?? []).map((c: any) => ({
      ...c,
      profiles: profileMap[c.author_id] ?? null,
    })),
    liked: likedPostIds.has(post.id),
    poll_vote_counts: pollVotes[post.id] ?? {},
    user_poll_vote: userVotes[post.id] ?? null,
  }));
}
```

**Step 2: Create `packages/supabase-client/src/mutations/social.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function createPostMutation(
  client: SupabaseClient,
  userId: string,
  data: {
    event_id: string;
    type: string;
    content: string;
    image_url?: string;
    poll_options?: string[];
  }
) {
  const { data: post, error } = await client
    .from("posts")
    .insert({
      event_id: data.event_id,
      author_id: userId,
      type: data.type,
      content: data.content,
      image_url: data.image_url || null,
      poll_options: data.poll_options
        ? data.poll_options.map((o, i) => ({ index: i, text: o, votes: 0 }))
        : null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const { data: profile } = await client
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .single();

  return { ...post, profiles: profile };
}

export async function togglePostLikeMutation(client: SupabaseClient, postId: string, userId: string) {
  const { data: existing } = await client
    .from("post_likes")
    .select("user_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    await client.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    return { liked: false };
  } else {
    await client.from("post_likes").insert({ post_id: postId, user_id: userId });
    return { liked: true };
  }
}

export async function createCommentMutation(
  client: SupabaseClient,
  postId: string,
  userId: string,
  content: string
) {
  const { data: comment, error } = await client
    .from("comments")
    .insert({ post_id: postId, author_id: userId, content })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const { data: profile } = await client
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .single();

  return { ...comment, profiles: profile };
}

export async function deletePostMutation(client: SupabaseClient, postId: string) {
  const { error } = await client.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
}

export async function votePollMutation(client: SupabaseClient, postId: string, userId: string, optionIndex: number) {
  const { data: existing } = await client
    .from("poll_votes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();

  if (existing) throw new Error("You already voted on this poll");

  const { error } = await client
    .from("poll_votes")
    .insert({ post_id: postId, user_id: userId, option_index: optionIndex });

  if (error) throw new Error(error.message);
}
```

**Step 3: Update web app files, verify, commit**

Same pattern as previous tasks.

```bash
git add packages/supabase-client/src/queries/social.ts packages/supabase-client/src/mutations/social.ts apps/attendee/src/features/social/
git commit -m "refactor: extract social/feed queries/mutations to @attendly/supabase-client"
```

---

## Task 6: Create Events Query in Shared Package

**Files:**
- Create: `packages/supabase-client/src/queries/events.ts`

**Step 1: Create `packages/supabase-client/src/queries/events.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getMyEvents(client: SupabaseClient, userId: string) {
  const { data: registrations, error } = await client
    .from("registrations")
    .select(`
      id,
      status,
      events(id, title, slug, description, start_date, end_date, location, cover_image_url, organizations(name, slug))
    `)
    .eq("user_id", userId)
    .in("status", ["confirmed", "checked_in"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return registrations ?? [];
}

export async function getEventBySlug(client: SupabaseClient, orgSlug: string, eventSlug: string) {
  const { data, error } = await client
    .from("events")
    .select(`*, organizations!inner(slug, name)`)
    .eq("slug", eventSlug)
    .eq("organizations.slug", orgSlug)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
```

**Step 2: Commit**

```bash
git add packages/supabase-client/src/queries/events.ts
git commit -m "feat: add events queries to @attendly/supabase-client"
```

---

## Task 7: Scaffold Expo Mobile App

**Files:**
- Replace: `apps/mobile/` (currently a placeholder)

**Step 1: Initialize Expo project**

Run from monorepo root:

```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly
rm -rf apps/mobile
npx create-expo-app@latest apps/mobile --template blank-typescript
```

**Step 2: Install dependencies**

```bash
cd apps/mobile
npx expo install expo-router expo-secure-store expo-notifications expo-device expo-constants @react-native-async-storage/async-storage react-native-safe-area-context react-native-screens expo-linking expo-status-bar expo-splash-screen
npm install @supabase/supabase-js @tanstack/react-query
```

**Step 3: Update `apps/mobile/package.json`**

Add workspace dependencies and update name/scripts:

```json
{
  "name": "@attendly/mobile",
  "main": "expo-router/entry",
  "dependencies": {
    "@attendly/shared": "workspace:*",
    "@attendly/supabase-client": "workspace:*"
  }
}
```

Merge these into the existing package.json generated by create-expo-app. Set `"main": "expo-router/entry"` for Expo Router.

**Step 4: Configure `app.json`**

Update `apps/mobile/app.json` with:

```json
{
  "expo": {
    "name": "Evenstry",
    "slug": "evenstry",
    "scheme": "evenstry",
    "version": "1.0.0",
    "orientation": "portrait",
    "platforms": ["ios", "android"],
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#445107"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

**Step 5: Run `pnpm install` from monorepo root**

```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && pnpm install
```

**Step 6: Create `.env` file**

Create `apps/mobile/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key-from-apps/web/.env.local>
```

**Step 7: Commit**

```bash
git add apps/mobile/
git commit -m "feat: scaffold Expo mobile app with dependencies"
```

---

## Task 8: Supabase Client Setup for Mobile

**Files:**
- Create: `apps/mobile/src/lib/supabase.ts`
- Create: `apps/mobile/src/lib/auth-context.tsx`

**Step 1: Create Supabase client with AsyncStorage**

Create `apps/mobile/src/lib/supabase.ts`:

```ts
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
```

**Step 2: Create Auth Context**

Create `apps/mobile/src/lib/auth-context.tsx`:

```tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthState = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
```

**Step 3: Commit**

```bash
git add apps/mobile/src/lib/
git commit -m "feat: add Supabase client and auth context for mobile"
```

---

## Task 9: Root Layout & Auth Screens

**Files:**
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/(auth)/sign-in.tsx`
- Create: `apps/mobile/app/(auth)/sign-up.tsx`
- Create: `apps/mobile/app/(auth)/_layout.tsx`

**Step 1: Create root layout**

Create `apps/mobile/app/_layout.tsx`:

```tsx
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../src/lib/auth-context";
import { ActivityIndicator, View } from "react-native";

const queryClient = new QueryClient();

function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

**Step 2: Create auth layout**

Create `apps/mobile/app/(auth)/_layout.tsx`:

```tsx
import { Stack } from "expo-router";

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**Step 3: Create sign-in screen**

Create `apps/mobile/app/(auth)/sign-in.tsx`:

```tsx
import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../src/lib/auth-context";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert("Sign In Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Evenstry</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign In"}</Text>
        </TouchableOpacity>

        <Link href="/(auth)/sign-up" style={styles.link}>
          <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8faf5" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  title: { fontSize: 32, fontWeight: "700", textAlign: "center", color: "#1a2e05", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6b7280", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12,
  },
  button: {
    backgroundColor: "#445107", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { marginTop: 16, alignSelf: "center" },
  linkText: { color: "#445107", fontSize: 14 },
});
```

**Step 4: Create sign-up screen**

Create `apps/mobile/app/(auth)/sign-up.tsx` — similar to sign-in but with full_name field and calls `signUp`.

**Step 5: Verify the app starts**

Run: `cd apps/mobile && npx expo start`

**Step 6: Commit**

```bash
git add apps/mobile/app/
git commit -m "feat: add root layout and auth screens for mobile"
```

---

## Task 10: Tab Navigator & Core Screens

**Files:**
- Create: `apps/mobile/app/(app)/_layout.tsx`
- Create: `apps/mobile/app/(app)/rooms/index.tsx`
- Create: `apps/mobile/app/(app)/people/index.tsx`
- Create: `apps/mobile/app/(app)/my-events/index.tsx`
- Create: `apps/mobile/app/(app)/profile/index.tsx`

**Step 1: Create tab layout**

Create `apps/mobile/app/(app)/_layout.tsx`:

```tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#445107",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { paddingBottom: 4, height: 56 },
        headerStyle: { backgroundColor: "#f8faf5" },
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="rooms/index"
        options={{
          title: "Rooms",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="people/index"
        options={{
          title: "People",
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-events/index"
        options={{
          title: "My Events",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

**Step 2: Create Rooms screen**

Create `apps/mobile/app/(app)/rooms/index.tsx`:

```tsx
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getRoomsByEvent } from "@attendly/supabase-client/queries/rooms";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";

export default function RoomsScreen() {
  // TODO: get eventId from user's current/selected event
  const { user } = useAuth();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      // Placeholder: will need event selection logic
      return [];
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#445107" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No rooms available</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8faf5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  card: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#1a2e05" },
  cardDescription: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  emptyText: { fontSize: 16, color: "#9ca3af" },
});
```

**Step 3: Create People, My Events, Profile screens** — follow same pattern as Rooms (placeholder with React Query skeleton).

**Step 4: Verify all tabs render**

Run: `cd apps/mobile && npx expo start`

**Step 5: Commit**

```bash
git add apps/mobile/app/(app)/
git commit -m "feat: add tab navigator and core screen skeletons for mobile"
```

---

## Task 11: Push Notifications — Database Migration

**Files:**
- Create: `packages/supabase/migrations/012_push_tokens.sql`

**Step 1: Create migration**

```sql
-- Push notification tokens for mobile devices
CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, expo_push_token)
);

-- RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can insert own tokens" ON public.push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tokens" ON public.push_tokens
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON public.push_tokens
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Grant access
GRANT SELECT, INSERT, DELETE ON public.push_tokens TO authenticated;
```

**Step 2: Apply migration**

Run: `cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && npx supabase migration up`

**Step 3: Commit**

```bash
git add packages/supabase/migrations/012_push_tokens.sql
git commit -m "feat: add push_tokens table migration"
```

---

## Task 12: Push Notifications — Supabase Edge Function

**Files:**
- Create: `supabase/functions/push-notification/index.ts`

**Step 1: Create Edge Function**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface WebhookPayload {
  type: "INSERT" | "UPDATE";
  table: string;
  record: Record<string, any>;
  old_record: Record<string, any> | null;
}

Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json();
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let targetUserIds: string[] = [];
  let title = "";
  let body = "";
  let data: Record<string, string> = {};

  // Determine notification based on table
  if (payload.table === "connections" && payload.type === "INSERT") {
    // New connection request
    targetUserIds = [payload.record.receiver_id];
    const { data: requester } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", payload.record.requester_id)
      .single();

    title = "New Connection Request";
    body = `${requester?.full_name ?? "Someone"} wants to connect with you`;
    data = { type: "connection", connectionId: payload.record.id };
  } else if (payload.table === "connections" && payload.type === "UPDATE" && payload.record.status === "accepted") {
    // Connection accepted
    targetUserIds = [payload.record.requester_id];
    const { data: accepter } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", payload.record.receiver_id)
      .single();

    title = "Connection Accepted";
    body = `${accepter?.full_name ?? "Someone"} accepted your connection request`;
    data = { type: "connection_accepted", connectionId: payload.record.id };
  } else if (payload.table === "messages" && payload.type === "INSERT") {
    // New message — notify other conversation members
    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", payload.record.conversation_id)
      .neq("user_id", payload.record.sender_id);

    targetUserIds = members?.map((m) => m.user_id) ?? [];

    const { data: sender } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", payload.record.sender_id)
      .single();

    title = sender?.full_name ?? "New Message";
    body = payload.record.content.substring(0, 100);
    data = { type: "message", conversationId: payload.record.conversation_id };
  } else {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  if (targetUserIds.length === 0) {
    return new Response(JSON.stringify({ skipped: true, reason: "no targets" }), { status: 200 });
  }

  // Fetch push tokens for target users
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("expo_push_token")
    .in("user_id", targetUserIds);

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ skipped: true, reason: "no tokens" }), { status: 200 });
  }

  // Send via Expo Push API
  const messages = tokens.map((t) => ({
    to: t.expo_push_token,
    sound: "default",
    title,
    body,
    data,
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  const result = await response.json();
  return new Response(JSON.stringify({ sent: messages.length, result }), { status: 200 });
});
```

**Step 2: Commit**

```bash
git add supabase/functions/push-notification/
git commit -m "feat: add push notification Edge Function using Expo Push API"
```

---

## Task 13: Push Notification Integration in Mobile App

**Files:**
- Create: `apps/mobile/src/lib/notifications.ts`
- Modify: `apps/mobile/app/_layout.tsx`

**Step 1: Create notifications helper**

Create `apps/mobile/src/lib/notifications.ts`:

```ts
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

  if (!projectId) {
    console.error("EAS project ID not found");
    return null;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  // Save token to Supabase
  await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      expo_push_token: token,
      platform: Platform.OS as "ios" | "android",
    },
    { onConflict: "user_id,expo_push_token" }
  );

  return token;
}

export function addNotificationListeners(
  onReceived?: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void
) {
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    onReceived?.(notification);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    onResponse?.(response);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
```

**Step 2: Integrate into root layout**

Add to `apps/mobile/app/_layout.tsx` inside `RootNavigator`, after the loading check:

```tsx
import { useEffect } from "react";
import { registerForPushNotifications, addNotificationListeners } from "../src/lib/notifications";
import { useRouter } from "expo-router";

// Inside RootNavigator component:
const router = useRouter();

useEffect(() => {
  if (!session?.user) return;

  registerForPushNotifications(session.user.id);

  const cleanup = addNotificationListeners(
    undefined,
    (response) => {
      const data = response.notification.request.content.data;
      if (data?.type === "message" && data?.conversationId) {
        // Navigate to messages when ready
      } else if (data?.type === "connection") {
        router.push("/(app)/people");
      }
    }
  );

  return cleanup;
}, [session?.user?.id]);
```

**Step 3: Verify the app starts without errors**

Run: `cd apps/mobile && npx expo start`

**Step 4: Commit**

```bash
git add apps/mobile/src/lib/notifications.ts apps/mobile/app/_layout.tsx
git commit -m "feat: integrate push notifications in mobile app"
```

---

## Task 14: Add Realtime Subscriptions to Shared Package

**Files:**
- Create: `packages/supabase-client/src/realtime/messaging.ts`

**Step 1: Create messaging realtime helper**

```ts
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

export function subscribeToMessages(
  client: SupabaseClient,
  conversationId: string,
  onMessage: (message: any) => void
): RealtimeChannel {
  return client
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload.new)
    )
    .subscribe();
}

export function unsubscribeFromMessages(client: SupabaseClient, channel: RealtimeChannel) {
  client.removeChannel(channel);
}
```

**Step 2: Commit**

```bash
git add packages/supabase-client/src/realtime/
git commit -m "feat: add realtime messaging subscription to @attendly/supabase-client"
```

---

## Summary of Implementation Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Scaffold `@attendly/supabase-client` | — |
| 2 | Extract room queries/mutations | 1 |
| 3 | Extract profile/people/connections | 1 |
| 4 | Extract messaging queries/mutations | 1 |
| 5 | Extract social/feed queries/mutations | 1 |
| 6 | Add events query | 1 |
| 7 | Scaffold Expo mobile app | 1 |
| 8 | Supabase client + auth context (mobile) | 7 |
| 9 | Root layout + auth screens | 8 |
| 10 | Tab navigator + core screens | 9 |
| 11 | Push tokens migration | — |
| 12 | Push notification Edge Function | 11 |
| 13 | Push notification mobile integration | 10, 12 |
| 14 | Realtime subscriptions | 1 |

Tasks 2-6 can run in parallel. Tasks 7-10 are sequential. Task 11-12 can run in parallel with 7-10.
