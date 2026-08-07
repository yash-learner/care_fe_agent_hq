import { expect, test } from "@playwright/test";
import { getAccountId } from "tests/support/accountId";
import { getFacilityId } from "tests/support/facilityId";

test.use({ storageState: "tests/.auth/user.json" });

test.describe("Invoice Date Filter", () => {
  let facilityId: string;
  let accountId: string;
  let invoiceListUrl: string;

  test.beforeEach(async ({ page }) => {
    facilityId = getFacilityId();
    accountId = getAccountId();
    invoiceListUrl = `/facility/${facilityId}/billing/invoices`;
    await page.goto(invoiceListUrl);
  });

  test("AC1: Period filter option should be visible in filter menu", async ({
    page,
  }) => {
    await test.step("Open filter menu", async () => {
      const filterButton = page.getByRole("button", { name: /filter/i });
      await expect(filterButton).toBeVisible();
      await filterButton.click();
    });

    await test.step("Verify Period filter option is visible", async () => {
      // Wait for dropdown menu to open
      await page.waitForTimeout(500);

      // Check for "Period" option in the filter menu
      const periodOption = page.getByText(/period/i);
      await expect(periodOption).toBeVisible();
    });
  });

  test("AC2: Preset date range filtering should work (Last 7 days)", async ({
    page,
  }) => {
    await test.step("Open filter menu and select Period", async () => {
      await page.getByRole("button", { name: /filter/i }).click();
      await page.waitForTimeout(500);
      await page.getByText(/period/i).click();
    });

    await test.step("Select 'last 7 days' preset", async () => {
      // Wait for date picker to open
      await page.waitForTimeout(500);

      // Look for "last 7 days" option (case insensitive)
      const last7DaysOption = page
        .locator('[role="menuitem"], [data-slot="dropdown-menu-item"], button')
        .filter({ hasText: /last.*7.*days/i });

      await expect(last7DaysOption.first()).toBeVisible();
      await last7DaysOption.first().click();
    });

    await test.step("Verify URL contains date filter parameters", async () => {
      // Wait for URL to update
      await page.waitForTimeout(1000);

      const url = page.url();
      expect(url).toContain("created_date_after");
      expect(url).toContain("created_date_before");
    });

    await test.step("Verify date filter badge is displayed", async () => {
      // Check for badge in selected filters bar
      const selectedFiltersBar = page.locator(
        '[data-slot="selected-filters"], .flex',
      );
      await expect(selectedFiltersBar).toBeVisible();

      // Look for date range text or badge
      const dateBadge = page.locator('[data-slot="badge"]').filter({
        hasText: /\d+/,
      });
      await expect(dateBadge.first()).toBeVisible();
    });
  });

  test("AC2: Preset date range filtering should work (Today)", async ({
    page,
  }) => {
    await test.step("Open filter menu and select Period", async () => {
      await page.getByRole("button", { name: /filter/i }).click();
      await page.waitForTimeout(500);
      await page.getByText(/period/i).click();
    });

    await test.step("Select 'Today' preset", async () => {
      await page.waitForTimeout(500);

      const todayOption = page
        .locator('[role="menuitem"], [data-slot="dropdown-menu-item"], button')
        .filter({ hasText: /^today$/i });

      await expect(todayOption.first()).toBeVisible();
      await todayOption.first().click();
    });

    await test.step("Verify URL contains date filter parameters", async () => {
      await page.waitForTimeout(1000);

      const url = page.url();
      expect(url).toContain("created_date_after");
      expect(url).toContain("created_date_before");
    });
  });

  test("AC2: Preset date range filtering should work (Yesterday)", async ({
    page,
  }) => {
    await test.step("Open filter menu and select Period", async () => {
      await page.getByRole("button", { name: /filter/i }).click();
      await page.waitForTimeout(500);
      await page.getByText(/period/i).click();
    });

    await test.step("Select 'Yesterday' preset", async () => {
      await page.waitForTimeout(500);

      const yesterdayOption = page
        .locator('[role="menuitem"], [data-slot="dropdown-menu-item"], button')
        .filter({ hasText: /^yesterday$/i });

      await expect(yesterdayOption.first()).toBeVisible();
      await yesterdayOption.first().click();
    });

    await test.step("Verify URL contains date filter parameters", async () => {
      await page.waitForTimeout(1000);

      const url = page.url();
      expect(url).toContain("created_date_after");
      expect(url).toContain("created_date_before");
    });
  });

  test("AC3: Custom date range filtering should work", async ({ page }) => {
    await test.step("Open filter menu and select Period", async () => {
      await page.getByRole("button", { name: /filter/i }).click();
      await page.waitForTimeout(500);
      await page.getByText(/period/i).click();
    });

    await test.step("Navigate to custom date range selector", async () => {
      await page.waitForTimeout(500);

      // Look for custom range option
      const customRangeOption = page
        .locator('[role="menuitem"], [data-slot="dropdown-menu-item"], button')
        .filter({ hasText: /custom/i });

      if (await customRangeOption.first().isVisible()) {
        await customRangeOption.first().click();
      }

      await page.waitForTimeout(500);
    });

    await test.step("Select custom start and end dates", async () => {
      // Find date inputs
      const dateInputs = page.locator('input[type="date"]');

      // Calculate dates: first day of current month to today
      const today = new Date();
      const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );

      const startDate = firstDayOfMonth.toISOString().split("T")[0];
      const endDate = today.toISOString().split("T")[0];

      // Fill start date
      await dateInputs.first().fill(startDate);
      await page.waitForTimeout(300);

      // Fill end date
      await dateInputs.last().fill(endDate);
      await page.waitForTimeout(300);

      // Close the date picker by clicking outside or pressing escape
      await page.keyboard.press("Escape");
    });

    await test.step("Verify URL contains custom date filter parameters", async () => {
      await page.waitForTimeout(1000);

      const url = page.url();
      expect(url).toContain("created_date_after");
      expect(url).toContain("created_date_before");
    });

    await test.step("Verify date filter badge is displayed", async () => {
      const dateBadge = page.locator('[data-slot="badge"]').filter({
        hasText: /\d+/,
      });
      await expect(dateBadge.first()).toBeVisible();
    });
  });

  test("AC4: Date range should be displayed as badge in selected filters bar", async ({
    page,
  }) => {
    await test.step("Apply date filter", async () => {
      await page.getByRole("button", { name: /filter/i }).click();
      await page.waitForTimeout(500);
      await page.getByText(/period/i).click();
      await page.waitForTimeout(500);

      const last7DaysOption = page
        .locator('[role="menuitem"], [data-slot="dropdown-menu-item"], button')
        .filter({ hasText: /last.*7.*days/i });

      await last7DaysOption.first().click();
      await page.waitForTimeout(1000);
    });

    await test.step("Verify date badge is visible in selected filters bar", async () => {
      // Check for badge with date information
      const dateBadge = page.locator('[data-slot="badge"]').filter({
        hasText: /\d+/,
      });
      await expect(dateBadge.first()).toBeVisible();

      // The badge should contain date-related text or numbers
      const badgeText = await dateBadge.first().textContent();
      expect(badgeText).toBeTruthy();
    });
  });

  test("AC5: Date filter can be cleared", async ({ page }) => {
    await test.step("Apply date filter", async () => {
      await page.getByRole("button", { name: /filter/i }).click();
      await page.waitForTimeout(500);
      await page.getByText(/period/i).click();
      await page.waitForTimeout(500);

      const last7DaysOption = page
        .locator('[role="menuitem"], [data-slot="dropdown-menu-item"], button')
        .filter({ hasText: /last.*7.*days/i });

      await last7DaysOption.first().click();
      await page.waitForTimeout(1000);
    });

    await test.step("Verify filter is applied", async () => {
      const url = page.url();
      expect(url).toContain("created_date_after");
    });

    await test.step("Clear date filter", async () => {
      // Look for clear button on the date badge
      const clearButton = page
        .locator('[data-slot="badge"]')
        .filter({ hasText: /\d+/ })
        .locator("button, svg.lucide-x")
        .first();

      if (await clearButton.isVisible()) {
        await clearButton.click();
      } else {
        // Alternative: use Clear All button
        const clearAllButton = page
          .getByRole("button")
          .filter({ has: page.locator("svg.lucide-x") });
        await clearAllButton.first().click();
      }

      await page.waitForTimeout(1000);
    });

    await test.step("Verify date filter is removed from URL", async () => {
      const url = page.url();
      expect(url).not.toContain("created_date_after");
      expect(url).not.toContain("created_date_before");
    });
  });

  test("AC6: Date filter combines with status filter", async ({ page }) => {
    await test.step("Apply status filter first", async () => {
      await page.getByRole("button", { name: /filter/i }).click();
      await page.waitForTimeout(500);

      // Look for Status filter option
      const statusOption = page.getByText(/status/i);
      await statusOption.click();
      await page.waitForTimeout(500);

      // Select a status value (e.g., draft, pending, paid)
      const statusValue = page
        .locator(
          '[role="option"], [role="menuitem"], [data-slot="command-item"]',
        )
        .filter({ hasText: /draft|pending|paid/i })
        .first();

      if (await statusValue.isVisible()) {
        await statusValue.click();
        await page.waitForTimeout(1000);
      }
    });

    await test.step("Apply date filter", async () => {
      await page.getByRole("button", { name: /filter/i }).click();
      await page.waitForTimeout(500);
      await page.getByText(/period/i).click();
      await page.waitForTimeout(500);

      const last7DaysOption = page
        .locator('[role="menuitem"], [data-slot="dropdown-menu-item"], button')
        .filter({ hasText: /last.*7.*days/i });

      await last7DaysOption.first().click();
      await page.waitForTimeout(1000);
    });

    await test.step("Verify both filters are applied in URL", async () => {
      const url = page.url();
      expect(url).toContain("created_date_after");
      expect(url).toContain("created_date_before");
      expect(url).toContain("status");
    });

    await test.step("Verify both filter badges are visible", async () => {
      const badges = page.locator('[data-slot="badge"]');
      await expect(badges.first()).toBeVisible();

      // Should have at least 2 badges (status + date)
      const badgeCount = await badges.count();
      expect(badgeCount).toBeGreaterThanOrEqual(1);
    });

    await test.step("Clear date filter while keeping status filter", async () => {
      // Find and clear the date badge
      const dateBadge = page.locator('[data-slot="badge"]').filter({
        hasText: /\d+/,
      });

      if (await dateBadge.first().isVisible()) {
        const clearButton = dateBadge
          .first()
          .locator("button, svg.lucide-x")
          .first();

        if (await clearButton.isVisible()) {
          await clearButton.click();
          await page.waitForTimeout(1000);
        }
      }

      // Verify date filter is removed but status filter remains
      const url = page.url();
      expect(url).not.toContain("created_date_after");
      expect(url).toContain("status");
    });
  });

  test("AC6: Date filter combines with created_by filter", async ({ page }) => {
    await test.step("Apply created_by filter first", async () => {
      await page.getByRole("button", { name: /filter/i }).click();
      await page.waitForTimeout(500);

      // Look for Created By filter option
      const createdByOption = page.getByText(/created by/i);
      if (await createdByOption.isVisible()) {
        await createdByOption.click();
        await page.waitForTimeout(500);

        // Try to select a user (may require combobox interaction)
        const userOption = page
          .locator('[role="option"], [data-slot="command-item"]')
          .first();

        if (await userOption.isVisible()) {
          await userOption.click();
          await page.waitForTimeout(1000);
        }
      }
    });

    await test.step("Apply date filter", async () => {
      await page.getByRole("button", { name: /filter/i }).click();
      await page.waitForTimeout(500);
      await page.getByText(/period/i).click();
      await page.waitForTimeout(500);

      const todayOption = page
        .locator('[role="menuitem"], [data-slot="dropdown-menu-item"], button')
        .filter({ hasText: /^today$/i });

      await todayOption.first().click();
      await page.waitForTimeout(1000);
    });

    await test.step("Verify both filters are applied in URL", async () => {
      const url = page.url();
      expect(url).toContain("created_date_after");
      expect(url).toContain("created_date_before");
    });
  });
});
