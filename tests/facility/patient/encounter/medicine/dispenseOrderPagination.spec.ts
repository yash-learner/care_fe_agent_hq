import { expect, test } from "@playwright/test";
import { getApiHeaders, getApiUrl } from "tests/helper/utils";
import { getEncounterId } from "tests/support/encounterId";
import { getFacilityId } from "tests/support/facilityId";
import { getPatientId } from "tests/support/patientId";

test.use({ storageState: "tests/.auth/user.json" });

test.describe("Dispense Order Pagination", () => {
  let facilityId: string;
  let patientId: string;
  let encounterId: string;
  let locationId: string;

  test.beforeAll(async () => {
    facilityId = getFacilityId();
    patientId = getPatientId();
    encounterId = getEncounterId();

    // Get location ID from fixtures
    const locationResponse = await fetch(
      `${getApiUrl()}/api/v1/facility/${facilityId}/location/?limit=1`,
      {
        headers: getApiHeaders(),
      },
    );
    const locationData = await locationResponse.json();
    locationId = locationData.results[0].id;
  });

  test("AC1 + AC2: First page loads 14 entries and scroll triggers next page", async ({
    page,
  }) => {
    await test.step("Create 20 dispense orders for pagination test", async () => {
      // Create 20 dispense orders via API
      for (let i = 0; i < 20; i++) {
        await fetch(
          `${getApiUrl()}/api/v1/facility/${facilityId}/order/dispense/`,
          {
            method: "POST",
            headers: getApiHeaders(),
            body: JSON.stringify({
              patient: patientId,
              location: locationId,
              status: "draft",
              name: `Test Dispense ${Date.now()}-${i}`,
              note: "QA pagination test",
            }),
          },
        );
        // Small delay to ensure unique timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });

    await test.step("Navigate to Dispense History tab", async () => {
      await page.goto(
        `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}`,
      );
      await page.getByRole("tab", { name: "Medicines" }).click();
      await page.getByRole("tab", { name: "Dispense History" }).click();
    });

    await test.step("Verify first page loads with 14 entries", async () => {
      // Wait for the dispense orders to load
      await page.waitForSelector('[data-slot="dispense-order-card"]', {
        state: "attached",
      });

      // Count visible entries
      const entries = await page
        .locator('[data-slot="dispense-order-card"]')
        .count();
      expect(entries).toBe(14);
    });

    await test.step("Scroll to bottom and verify next page loads", async () => {
      // Scroll the selector to bottom (desktop sidebar)
      const sidebar = page.locator(".hidden.lg\\:block .space-y-2");
      await sidebar.evaluate((el) => {
        el.scrollTo(0, el.scrollHeight);
      });

      // Wait for loading skeleton to appear
      await expect(page.locator(".animate-pulse").first()).toBeVisible({
        timeout: 2000,
      });

      // Wait for next page to load (should have 20 total entries now)
      await expect(
        page.locator('[data-slot="dispense-order-card"]'),
      ).toHaveCount(20, { timeout: 5000 });
    });

    await test.step("Verify selection works for paginated entries", async () => {
      // Find all cards
      const cards = page.locator('[data-slot="dispense-order-card"]');

      // Click the last entry (entry 20, which is on page 2)
      await cards.nth(19).click();

      // Verify it's selected (has blue border via border-primary-600 class)
      await expect(cards.nth(19)).toHaveClass(/border-primary-600/);
    });
  });

  test("AC3: End of list stops fetching", async ({ page }) => {
    await test.step("Navigate to Dispense History tab", async () => {
      await page.goto(
        `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}`,
      );
      await page.getByRole("tab", { name: "Medicines" }).click();
      await page.getByRole("tab", { name: "Dispense History" }).click();
    });

    await test.step("Scroll to load all pages", async () => {
      // Wait for initial load
      await page.waitForSelector('[data-slot="dispense-order-card"]', {
        state: "attached",
      });

      // Scroll to bottom to load page 2
      const sidebar = page.locator(".hidden.lg\\:block .space-y-2");
      await sidebar.evaluate((el) => {
        el.scrollTo(0, el.scrollHeight);
      });

      // Wait for page 2 to load (20 total entries)
      await expect(
        page.locator('[data-slot="dispense-order-card"]'),
      ).toHaveCount(20, { timeout: 5000 });
    });

    await test.step("Verify no more requests after all pages loaded", async () => {
      // Scroll to bottom again
      const sidebar = page.locator(".hidden.lg\\:block .space-y-2");
      await sidebar.evaluate((el) => {
        el.scrollTo(0, el.scrollHeight);
      });

      // Wait a moment
      await page.waitForTimeout(2000);

      // Verify no loading skeleton appears
      await expect(page.locator(".animate-pulse").first()).not.toBeVisible();

      // Verify count is still 20
      await expect(
        page.locator('[data-slot="dispense-order-card"]'),
      ).toHaveCount(20);
    });
  });

  test("AC5: Short lists do not trigger repeated fetches", async ({ page }) => {
    await test.step("Create only 10 dispense orders", async () => {
      // Clear existing orders by creating a fresh test with fewer orders
      // Use a different timestamp range to ensure we only see the new orders
      const timestamp = Date.now();
      for (let i = 0; i < 10; i++) {
        await fetch(
          `${getApiUrl()}/api/v1/facility/${facilityId}/order/dispense/`,
          {
            method: "POST",
            headers: getApiHeaders(),
            body: JSON.stringify({
              patient: patientId,
              location: locationId,
              status: "draft",
              name: `Short Test ${timestamp}-${i}`,
              note: "QA short list test",
            }),
          },
        );
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });

    await test.step("Navigate to Dispense History tab", async () => {
      await page.goto(
        `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}`,
      );
      await page.getByRole("tab", { name: "Medicines" }).click();
      await page.getByRole("tab", { name: "Dispense History" }).click();
    });

    await test.step("Verify short list loads without pagination", async () => {
      // Wait for entries to load
      await page.waitForSelector('[data-slot="dispense-order-card"]', {
        state: "attached",
      });

      // Count should be >= 10 (our new orders plus any from previous tests)
      const count = await page
        .locator('[data-slot="dispense-order-card"]')
        .count();
      expect(count).toBeGreaterThanOrEqual(10);

      // Scroll to bottom
      const sidebar = page.locator(".hidden.lg\\:block .space-y-2");
      await sidebar.evaluate((el) => {
        el.scrollTo(0, el.scrollHeight);
      });

      // Wait a moment
      await page.waitForTimeout(2000);

      // Verify no loading skeleton appears
      await expect(page.locator(".animate-pulse").first()).not.toBeVisible();

      // Verify count hasn't changed (no new page loaded)
      const countAfter = await page
        .locator('[data-slot="dispense-order-card"]')
        .count();
      expect(countAfter).toBe(count);
    });
  });

  test("AC6: Pagination works on mobile", async ({ page }) => {
    await test.step("Navigate to Dispense History tab", async () => {
      await page.goto(
        `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}`,
      );
      await page.getByRole("tab", { name: "Medicines" }).click();
      await page.getByRole("tab", { name: "Dispense History" }).click();
    });

    await test.step("Resize to mobile and open drawer", async () => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Click the drawer trigger button
      await page
        .locator(".lg\\:hidden button")
        .filter({ hasText: /Test Dispense|location/i })
        .first()
        .click();
    });

    await test.step("Verify pagination works in mobile drawer", async () => {
      // Wait for drawer content to be visible
      await page.waitForSelector('[role="dialog"]', { state: "visible" });

      // Count initial entries
      const initialCount = await page
        .locator('[data-slot="dispense-order-card"]')
        .count();
      expect(initialCount).toBe(14);

      // Scroll drawer content to bottom
      const drawerContent = page.locator('[role="dialog"] .overflow-y-auto');
      await drawerContent.evaluate((el) => {
        el.scrollTo(0, el.scrollHeight);
      });

      // Wait for next page to load
      await expect(
        page.locator('[data-slot="dispense-order-card"]'),
      ).toHaveCount(20, { timeout: 5000 });

      // Click on a paginated entry
      await page.locator('[data-slot="dispense-order-card"]').nth(15).click();

      // Verify drawer closes
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });
  });

  test("AC7: Loading indicator appears during pagination", async ({ page }) => {
    await test.step("Navigate to Dispense History tab", async () => {
      await page.goto(
        `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}`,
      );
      await page.getByRole("tab", { name: "Medicines" }).click();
      await page.getByRole("tab", { name: "Dispense History" }).click();
    });

    await test.step("Verify loading skeleton appears when scrolling", async () => {
      // Wait for initial load
      await page.waitForSelector('[data-slot="dispense-order-card"]', {
        state: "attached",
      });

      // Scroll to bottom to trigger next page load
      const sidebar = page.locator(".hidden.lg\\:block .space-y-2");
      await sidebar.evaluate((el) => {
        el.scrollTo(0, el.scrollHeight);
      });

      // Verify loading skeleton appears
      const skeleton = page.locator(".animate-pulse").first();
      await expect(skeleton).toBeVisible({ timeout: 1000 });

      // Wait for loading to complete
      await expect(skeleton).not.toBeVisible({ timeout: 5000 });

      // Verify new entries loaded
      const count = await page
        .locator('[data-slot="dispense-order-card"]')
        .count();
      expect(count).toBeGreaterThan(14);
    });
  });
});
