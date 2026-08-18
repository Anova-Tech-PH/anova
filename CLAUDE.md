# Eventriv — Development Notes

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
- Tests collocated next to source files (`.test.ts` / `.test.tsx`), E2E tests in `tests/e2e/`
- Every feature change must include tests (see `attendly-testing` skill)
- **Always use `/test-driven-development` when building new features or fixing bugs** — write tests first, then implement
- **Never use browser `alert()` or `confirm()` dialogs** — use proper UI dialog components (e.g. `AlertDialog` from `@attendly/ui/components`) for confirmations and alerts

## Playwright & External Sites

- Some external sites (e.g. Whova) block Playwright's default browser fingerprint (return 502/403)
- **Workaround:** Use `browser_run_code_unsafe` to create a new browser context with a real user agent and disabled webdriver detection:

```js
async (page) => {
  const browser = page.context().browser();
  const mainContext = page.context();

  // Close all extra contexts first to prevent multiple windows
  for (const ctx of browser.contexts()) {
    if (ctx !== mainContext) await ctx.close();
  }

  // Copy cookies from existing contexts (where you logged in)
  let cookies = [];
  for (const ctx of browser.contexts()) {
    cookies = cookies.concat(await ctx.cookies());
  }

  // Create new context with real user agent
  const newContext = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US'
  });

  // Add site cookies from your logged-in session
  const siteCookies = cookies.filter(c => c.domain.includes('whova'));
  if (siteCookies.length > 0) {
    await newContext.addCookies(siteCookies);
  }

  const newPage = await newContext.newPage();

  // Stealth patches to bypass bot detection
  await newPage.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    window.chrome = { runtime: {} };
  });

  await newPage.goto('https://whova.com/...', { waitUntil: 'networkidle' });
  await newPage.screenshot({ path: 'screenshot.png', fullPage: true });

  // Always close the context when done to prevent stacking windows
  await newContext.close();
}
```

- **Key tricks that bypass 502:**
  1. Custom user agent — sites block Playwright's default UA
  2. Stealth patches — `navigator.webdriver = false`, fake plugins, `window.chrome`
  3. Copying cookies from already-logged-in browser context into the new one
  4. Close extra contexts before and after to prevent multiple windows
- Always try this approach when Playwright gets blocked by an external site
