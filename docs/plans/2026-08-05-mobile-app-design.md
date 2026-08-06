# Evenstry Mobile App Design

**Date:** 2026-08-05
**Approach:** Expo Managed + Shared Business Logic + Supabase Edge Functions for Push

## Overview

Build a React Native mobile app (iOS + Android) for the attendee experience using Expo managed workflow. Share business logic (queries, mutations, realtime subscriptions) between web and mobile via a new `@attendly/supabase-client` package. UI is built natively for mobile — no cross-platform UI abstraction.

## Architecture

```
packages/
  shared/              <- existing (Zod schemas, types, constants)
  supabase-client/     <- NEW (queries, mutations, realtime subscriptions)
  ui/                  <- existing (web-only UI components)
apps/
  attendee/            <- existing Next.js web app (refactored to use supabase-client)
  mobile/              <- Expo app (uses supabase-client)
supabase/
  functions/
    push-notification/ <- NEW Edge Function for server-side push
```

## 1. Shared Package — `@attendly/supabase-client`

Platform-agnostic Supabase data access. All functions accept a `SupabaseClient` instance as the first argument, so each platform provides its own client initialization.

```
packages/supabase-client/
  src/
    client.ts            <- factory: createClient(url, key, options)
    queries/
      events.ts          <- getEvents(), getEventBySlug()
      rooms.ts           <- getRooms(), getRoomSessions()
      people.ts          <- getAttendees(), getConnections()
      profile.ts         <- getProfile()
    mutations/
      registration.ts    <- registerForEvent(), cancelRegistration()
      connections.ts     <- sendConnectionRequest(), acceptConnection()
      profile.ts         <- updateProfile()
    realtime/
      messaging.ts       <- subscribeToMessages(), subscribeToUnread()
      feed.ts            <- subscribeToFeed()
    index.ts
  package.json
```

Example function signature:

```ts
export async function getRooms(client: SupabaseClient, eventId: string) {
  return client.from('rooms').select('*, sessions(*)').eq('event_id', eventId);
}
```

## 2. Mobile App — `apps/mobile`

Expo managed project with Expo Router (file-based routing).

```
apps/mobile/
  app/
    _layout.tsx            <- root layout (auth check, providers)
    (auth)/
      sign-in.tsx
      sign-up.tsx
    (app)/
      _layout.tsx          <- tab navigator
      rooms/
        index.tsx
        [roomId].tsx
      people/
        index.tsx
      my-events/
        index.tsx
      profile/
        index.tsx
  src/
    lib/
      supabase.ts          <- client init with expo-secure-store
      notifications.ts     <- Expo Notifications setup + token registration
    components/            <- mobile-specific UI components
    hooks/                 <- mobile-specific hooks (useAuth, usePushToken)
  app.json
  package.json
```

### Key Dependencies

- `expo`, `expo-router`, `expo-secure-store`, `expo-notifications`
- `@supabase/supabase-js` (not `@supabase/ssr`)
- `@attendly/shared` (schemas, types)
- `@attendly/supabase-client` (queries, mutations, realtime)
- `@tanstack/react-query` (same caching strategy as web)

### Auth Flow

Supabase Auth with tokens stored in `expo-secure-store`. On launch, check for existing session and route to (auth) or (app) group accordingly.

### Navigation

Bottom tabs: Rooms, People, My Events, Profile (Feed and Messages excluded for now, same as web).

## 3. Push Notifications — Supabase Edge Functions

Server-side push triggered by database changes, delivered via Expo Push API.

### Database Table

```sql
push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  expo_push_token text not null,
  platform text not null,  -- 'ios' | 'android'
  created_at timestamptz default now()
)
```

### Flow

1. Mobile app gets Expo Push Token on launch, saves to `push_tokens` table
2. Database webhooks fire on relevant inserts (new message, connection request, etc.)
3. Edge Function (`supabase/functions/push-notification/index.ts`) looks up target user's push tokens and sends via Expo Push API

### Notification Triggers (Initial Set)

- Room update for events user is registered for
- Connection request received/accepted
- Event reminder (event starts in 30 min)

### Why Expo Push API

Zero native FCM/APNs config needed. Works for both platforms with one endpoint. Free tier is generous. Can migrate to raw FCM/APNs later if needed.

## 4. Web App Migration

Incrementally refactor `apps/attendee` to import from `@attendly/supabase-client`:

1. Extract existing inline Supabase queries/mutations into the shared package
2. Update web feature imports to use `@attendly/supabase-client`
3. Server actions remain in the web app as Next.js-specific wrappers calling shared functions

No UI changes to the web app. Purely a data layer extraction.

## Implementation Order

1. Create `@attendly/supabase-client` package with extracted queries/mutations
2. Refactor web app to use the shared package
3. Scaffold Expo app in `apps/mobile`
4. Build auth flow (sign-in, sign-up, session management)
5. Build core screens (rooms, people, my-events, profile)
6. Add realtime subscriptions
7. Add push_tokens migration + Edge Function
8. Integrate push notifications in mobile app
