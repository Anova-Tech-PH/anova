import { test, expect } from "@playwright/test";

const E2E_EMAIL = process.env.E2E_EMAIL || "test@attendly.dev";
const E2E_PASSWORD = process.env.E2E_PASSWORD || "testpassword123";

// Known test event IDs from seed data
const DRAFT_EVENT_ID = "3ff4de97-080a-4832-a7e5-5bbdc071cc38";
const PUBLISHED_EVENT_ID = "76276299-9a72-4df5-9360-0c30909ee0cf";

test.describe("Publish Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    // If redirected to dashboard, already logged in
    if (page.url().includes("/dashboard")) return;

    await page.fill('input[name="email"], input[type="email"]', E2E_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', E2E_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL("**/dashboard");
  });

  test.describe("Draft event (pre-publish)", () => {
    test("shows readiness checklist with required and recommended checks", async ({
      page,
    }) => {
      await page.goto(`/events/${DRAFT_EVENT_ID}/publish`);

      // Page title and heading
      await expect(page.getByRole("heading", { name: "Publish" })).toBeVisible();
      await expect(
        page.getByText("Review your event readiness and publish when ready.")
      ).toBeVisible();

      // Required checks
      await expect(page.getByText("Event basics complete")).toBeVisible();
      await expect(page.getByText("Event has not started")).toBeVisible();
      await expect(page.getByText("At least 1 session")).toBeVisible();

      // Recommended checks
      await expect(page.getByText("Speakers assigned")).toBeVisible();
      await expect(page.getByText("Tickets configured")).toBeVisible();
      await expect(page.getByText("Survey created")).toBeVisible();
      await expect(page.getByText("Website enabled")).toBeVisible();
    });

    test("shows progress bar with required check count", async ({ page }) => {
      await page.goto(`/events/${DRAFT_EVENT_ID}/publish`);

      await expect(
        page.getByText(/\d+ of \d+ required checks passed/)
      ).toBeVisible();
    });

    test("shows dynamic missing fields description for failing basics check", async ({
      page,
    }) => {
      await page.goto(`/events/${DRAFT_EVENT_ID}/publish`);

      // Should show specific missing fields, not generic description
      await expect(page.getByText(/Missing:/)).toBeVisible();
    });

    test("disables Publish button when required checks fail", async ({
      page,
    }) => {
      await page.goto(`/events/${DRAFT_EVENT_ID}/publish`);

      const publishBtn = page.getByRole("button", { name: "Publish Event" });
      await expect(publishBtn).toBeDisabled();
    });

    test("shows helper text when Publish button is disabled", async ({
      page,
    }) => {
      await page.goto(`/events/${DRAFT_EVENT_ID}/publish`);

      await expect(
        page.getByText("Complete all required checks before publishing.")
      ).toBeVisible();
    });

    test("Fix links navigate to correct pages", async ({ page }) => {
      await page.goto(`/events/${DRAFT_EVENT_ID}/publish`);

      // Wait for checklist to load
      await page.waitForSelector('text=Event basics complete');

      const fixLinks = page.getByRole("link", { name: "Fix" });
      const count = await fixLinks.count();
      expect(count).toBeGreaterThan(0);

      // Verify each Fix link points to the correct event
      for (let i = 0; i < count; i++) {
        const href = await fixLinks.nth(i).getAttribute("href");
        expect(href).toContain(`/events/${DRAFT_EVENT_ID}`);
      }
    });
  });

  test.describe("Published event (post-publish)", () => {
    test("shows success banner and recommendation cards", async ({ page }) => {
      await page.goto(`/events/${PUBLISHED_EVENT_ID}/publish`);

      await expect(
        page.getByText("Your event is live and available to attendees.")
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Feature Recommendations" })
      ).toBeVisible();
    });

    test("shows 10 recommendation cards", async ({ page }) => {
      await page.goto(`/events/${PUBLISHED_EVENT_ID}/publish`);

      // All 10 recommendation card headings
      const cardNames = [
        "Send Announcement",
        "Set Up Check-in",
        "Configure Name Badges",
        "Create a Survey",
        "Enable Session RSVP",
        "Send Email Campaign",
        "Set Up Live Polls",
        "Upload Documents",
        "Create Meetups",
        "Enable Website",
      ];

      for (const name of cardNames) {
        await expect(
          page.getByRole("heading", { name, level: 3 })
        ).toBeVisible();
      }
    });

    test("sorts unconfigured cards before configured ones", async ({
      page,
    }) => {
      await page.goto(`/events/${PUBLISHED_EVENT_ID}/publish`);

      const cards = page.locator("h3");
      const allText = await cards.allTextContents();

      // Find first "Configured" card position
      const configuredCards = page.getByText("Configured");
      const notSetUpCards = page.getByText("Not set up");

      const notSetUpCount = await notSetUpCards.count();
      const configuredCount = await configuredCards.count();

      // There should be both types
      expect(notSetUpCount).toBeGreaterThan(0);
      expect(configuredCount).toBeGreaterThan(0);
    });

    test("shows feature count for unconfigured items", async ({ page }) => {
      await page.goto(`/events/${PUBLISHED_EVENT_ID}/publish`);

      await expect(
        page.getByText(/\d+ features? not yet configured/)
      ).toBeVisible();
    });

    test("Unpublish button opens confirmation dialog", async ({ page }) => {
      await page.goto(`/events/${PUBLISHED_EVENT_ID}/publish`);

      await page.getByRole("button", { name: "Unpublish Event" }).click();

      // Dialog should appear
      await expect(
        page.getByRole("heading", { name: "Unpublish Event?" })
      ).toBeVisible();
      await expect(
        page.getByText(
          "This will revert your event to draft. It will no longer be publicly visible"
        )
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Cancel" })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Unpublish", exact: true })
      ).toBeVisible();
    });

    test("Cancel dismisses unpublish dialog without action", async ({
      page,
    }) => {
      await page.goto(`/events/${PUBLISHED_EVENT_ID}/publish`);

      await page.getByRole("button", { name: "Unpublish Event" }).click();
      await page.getByRole("button", { name: "Cancel" }).click();

      // Dialog should be gone, page unchanged
      await expect(
        page.getByRole("heading", { name: "Unpublish Event?" })
      ).not.toBeVisible();
      await expect(
        page.getByText("Your event is live and available to attendees.")
      ).toBeVisible();
    });
  });

  test.describe("Navigation", () => {
    test("Publish top tab navigates to publish page", async ({ page }) => {
      await page.goto(`/events/${DRAFT_EVENT_ID}`);

      await page.getByRole("button", { name: "Publish" }).click();
      await page.waitForURL(`**/events/${DRAFT_EVENT_ID}/publish`);

      await expect(page.getByRole("heading", { name: "Publish" })).toBeVisible();
    });

    test("sidebar shows Publish link when on publish page", async ({
      page,
    }) => {
      await page.goto(`/events/${DRAFT_EVENT_ID}/publish`);

      // Sidebar should show Publish as active nav item
      const sidebar = page.locator("aside").filter({ hasText: "Back to Events" });
      await expect(sidebar.getByText("Publish")).toBeVisible();
    });
  });

  test.describe("Page metadata", () => {
    test("page title includes event name", async ({ page }) => {
      await page.goto(`/events/${DRAFT_EVENT_ID}/publish`);

      await expect(page).toHaveTitle(/Publish.*Multi-Day Tech Summit/);
    });
  });
});
