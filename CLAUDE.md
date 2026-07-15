# Attendly — Development Notes

## Supabase

- **Never use `supabase db reset`** when adding new migrations. Always use `npx supabase migration up` instead. This preserves existing data and user accounts.
- Local Supabase ports: 54331 (API), 54332 (DB), 54333 (Studio), 54334 (Inbucket)
- Column naming: `organization_id` (not `org_id`) throughout the schema
- Supabase returns arrays for joined relations (e.g., `room.sessions` is an array, not object)
- `SECURITY DEFINER` functions bypass RLS (used in `is_org_member`, `create_organization_with_owner`)
- RLS requires BOTH table-level grants (GRANT SELECT to anon/authenticated) AND row-level policies

## Tech Stack

- Turborepo monorepo with pnpm workspaces
- Next.js 16 with Turbopack, React 19, TypeScript, Tailwind 4
- Supabase (PostgreSQL, Auth, RLS, Realtime)
- Server Actions for mutations, server-side Supabase client for queries

## Conventions

- Feature module pattern: `src/features/{name}/actions.ts`, `queries.ts`, `components/`
- Route groups: `(auth)`, `(organizer)`, `(public)`, `(attendee)`
- UI components: import from `@/shared/components/ui`
- Seed data uses fixed UUIDs (`00000000-0000-0000-0000-00000000XXXX`)
