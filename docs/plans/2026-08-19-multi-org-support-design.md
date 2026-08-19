# Multi-Org Support Design

## Problem

The app assumes each user belongs to one organization. Users with multiple orgs hit PGRST116 errors because queries use `.single()` without scoping to a specific org. There's no way to switch between organizations.

## Solution

Add org-scoped URLs (`/org/[orgSlug]/...`) and an org switcher in the sidebar. Every organizer route becomes org-aware through the URL slug.

## Architecture

### URL Structure

Current:
```
/dashboard
/events
/events/[eventId]/...
/events/new
/settings
/settings/team
```

New:
```
/org/[orgSlug]/dashboard
/org/[orgSlug]/events
/org/[orgSlug]/events/[eventId]/...
/org/[orgSlug]/events/new
/org/[orgSlug]/settings
/org/[orgSlug]/settings/team
```

The `(organizer)` route group moves under `app/org/[orgSlug]/`. The `[orgSlug]` param is resolved in the layout to provide the org context.

### Route Group Changes

```
app/
  org/
    [orgSlug]/
      layout.tsx          -- resolves orgSlug, validates membership, provides org context
      dashboard/page.tsx
      events/page.tsx
      events/new/page.tsx
      events/[eventId]/...
      settings/page.tsx
      settings/team/page.tsx
      settings/sign-out-button.tsx
```

The old `(organizer)` route group is removed entirely.

### Org Context Resolution

The `org/[orgSlug]/layout.tsx` will:
1. Read `orgSlug` from params
2. Look up the organization by slug
3. Verify the current user is a member
4. If not a member, redirect to their first org or onboarding
5. Pass org data to children via a shared utility (not React Context, since these are server components)

A server-side helper `getOrgFromSlug(orgSlug)` will be created in `src/features/org/queries.ts` to:
- Resolve the org by slug
- Validate membership
- Return `{ id, name, slug, role }` or null

Each page receives `orgSlug` from `params` and calls this helper, or the layout does it once and pages use `params.orgSlug` to call org-scoped queries.

### Org Switcher UI

In the sidebar, below the EVENTRIV wordmark, add a dropdown showing the current org name. Clicking it reveals a list of all orgs the user belongs to. Selecting one navigates to `/org/[newSlug]/dashboard`.

```
EVENTRIV
[v Billion Soul Harvest]   <-- dropdown
  - Billion Soul Harvest  (active)
  - Anova Tech
  - + Create organization
```

This is a client component that:
1. Fetches the user's orgs on mount (client-side Supabase query)
2. Shows current org from the URL slug
3. On select, navigates via `router.push('/org/${slug}/dashboard')`

### Middleware Changes

Current middleware checks `/dashboard` and `/events` prefixes. Update to:
- Protect `/org/*` routes (require auth + org membership)
- Redirect `/dashboard` -> `/org/[first-org-slug]/dashboard` (backwards compat)
- Redirect `/events` -> `/org/[first-org-slug]/events`
- On login, redirect to `/org/[first-org-slug]/dashboard` instead of `/dashboard`

### Pages That Need Org Scoping

These pages currently query `organization_members` to find an org. They will instead receive `orgSlug` from params:

| Page | Current Approach | New Approach |
|------|-----------------|--------------|
| `dashboard/page.tsx` | `getDashboardStats(userId)` queries all orgs | `getDashboardStats(orgId)` queries single org |
| `events/page.tsx` | Fetches all org memberships, queries across all | Query events by single `orgId` from params |
| `events/new/page.tsx` | `.single()` on org_members with role=owner | Use `orgId` from params |
| `settings/page.tsx` | `.single()` on org_members with role=owner | Use `orgId` from params |
| `settings/team/page.tsx` | `.limit(1).single()` on org_members | Use `orgId` from params |

### Server Actions

Server actions (`features/team/actions.ts`, `features/events/actions.ts`, `features/templates/actions.ts`, `features/payments/actions.ts`) that resolve org from membership will need the `orgId` passed as a parameter instead. Most already accept `orgId` — the ones that don't will be updated.

### Sidebar Nav Links

All sidebar links update from `/dashboard` to `/org/${orgSlug}/dashboard`, etc. The layout already knows `orgSlug` from params and passes it down.

### Backwards Compatibility

Add redirects in middleware:
- `/dashboard` -> `/org/[first-org]/dashboard`
- `/events` -> `/org/[first-org]/events`
- `/events/new` -> `/org/[first-org]/events/new`
- `/settings` -> `/org/[first-org]/settings`

### Onboarding Flow

After onboarding creates a new org, redirect to `/org/[new-org-slug]/dashboard` instead of `/dashboard`.

## Files to Create

1. `src/features/org/queries.ts` — `getOrgBySlug()`, `getUserOrgs()`
2. `app/org/[orgSlug]/layout.tsx` — org-scoped layout with sidebar + switcher
3. `src/shared/components/org-switcher.tsx` — dropdown component

## Files to Move/Update

1. **Move** `app/(organizer)/*` -> `app/org/[orgSlug]/*`
2. **Update** `middleware.ts` — new route patterns + redirects
3. **Update** `app/(organizer)/dashboard/page.tsx` — use orgId from params
4. **Update** `app/(organizer)/events/page.tsx` — use orgId from params
5. **Update** `app/(organizer)/events/new/page.tsx` — use orgId from params
6. **Update** `app/(organizer)/settings/page.tsx` — use orgId from params
7. **Update** `app/(organizer)/settings/team/page.tsx` — use orgId from params
8. **Update** `features/dashboard/queries.ts` — accept orgId instead of userId
9. **Update** `app/(auth)/onboarding/page.tsx` — redirect to `/org/[slug]/dashboard`
10. **Delete** old `app/(organizer)/` directory

## Out of Scope

- Org creation from the switcher (just a link to onboarding for now)
- Org-level settings editing (name, slug)
- Role-based access differences between orgs
- Transferring events between orgs
