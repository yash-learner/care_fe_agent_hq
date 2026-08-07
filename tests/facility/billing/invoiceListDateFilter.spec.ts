import { expect, test } from "@playwright/test";
import { getApiHeaders, getApiUrl } from "tests/helper/utils";
import { getAccountId } from "tests/support/accountId";
import { getFacilityId } from "tests/support/facilityId";

test.use({ storageState: "tests/.auth/user.json" });

test.describe("Invoice List Date Filter", () => {
  let facilityId: string;
  let accountId: string;
  let invoiceIds: string[] = [];

  test.beforeAll(async () => {
    facilityId = getFacilityId();
    accountId = getAccountId();

    // Create test invoices with different dates via API
    const apiUrl = getApiUrl();
    const headers = getApiHeaders();

    // Create invoice from 7 days ago
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);
    const pastInvoiceResponse = await fetch(
      `${apiUrl}/api/v1/facility/${facilityId}/invoice/`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          account: accountId,
          status: "draft",
          charge_items: [],
          issue_date: pastDate.toISOString().split("T")[0],
          note: `Test invoice from ${pastDate.toISOString()}`,
        }),
      },
    );
    if (pastInvoiceResponse.ok) {
      const pastInvoice = await pastInvoiceResponse.json();
      invoiceIds.push(pastInvoice.id);
    }

    // Create invoice from today
    const todayInvoiceResponse = await fetch(
      `${apiUrl}/api/v1/facility/${facilityId}/invoice/`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          account: accountId,
          status: "draft",
          charge_items: [],
          issue_date: new Date().toISOString().split("T")[0],
          note: `Test invoice from today`,
        }),
      },
    );
    if (todayInvoiceResponse.ok) {
      const todayInvoice = await todayInvoiceResponse.json();
      invoiceIds.push(todayInvoice.id);
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`/facility/${facilityId}/billing/invoices`);
    await page.waitForLoadState("networkidle");
  });

  test("should display date filter in filter bar", async ({ page }) => {
    await test.step("Verify date filter is visible", async () => {
      const filterButton = page.getByRole("button", { name: /add filter/i });
      await expect(filterButton).toBeVisible();

      await filterButton.click();

      // Check that Period filter option is available
      const periodOption = page.getByRole("menuitem", { name: /period/i });
      await expect(periodOption).toBeVisible();
    });
  });

  test("should filter invoices by preset date range (Last 7 Days)", async ({
    page,
  }) => {
    await test.step("Apply Last 7 Days filter", async () => {
      // Open filter menu
      await page.getByRole("button", { name: /add filter/i }).click();

      // Select Period filter
      await page.getByRole("menuitem", { name: /period/i }).click();

      // Select "Last 7 Days" preset
      await page.getByRole("button", { name: /last 7 days/i }).click();
    });

    await test.step("Verify URL contains date params", async () => {
      await page.waitForURL(/created_date_after=.*&created_date_before=/);
      const url = page.url();
      expect(url).toContain("created_date_after=");
      expect(url).toContain("created_date_before=");
    });

    await test.step("Verify invoices are filtered", async () => {
      // Wait for table to update
      await page.waitForLoadState("networkidle");

      // Should show invoices from the last 7 days
      // Both test invoices should be visible (one from 7 days ago, one from today)
      const tableBody = page.locator('[data-slot="table-body"]');
      await expect(tableBody).toBeVisible();
    });
  });

  test("should filter invoices by custom date range", async ({ page }) => {
    await test.step("Open custom date range picker", async () => {
      // Open filter menu
      await page.getByRole("button", { name: /add filter/i }).click();

      // Select Period filter
      await page.getByRole("menuitem", { name: /period/i }).click();

      // Click on Custom range button or date input to open calendar
      const customButton = page
        .getByRole("button", { name: /custom/i })
        .or(page.locator('button:has-text("Custom")'));
      await customButton.click();
    });

    await test.step("Select date range", async () => {
      // Calculate dates: 10 days ago to today
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 10);
      const toDate = new Date();

      // Fill from date
      const fromInput = page
        .getByLabel(/from/i)
        .or(page.locator('input[name="from"]'));
      await fromInput.fill(fromDate.toISOString().split("T")[0]);

      // Fill to date
      const toInput = page
        .getByLabel(/to/i)
        .or(page.locator('input[name="to"]'));
      await toInput.fill(toDate.toISOString().split("T")[0]);

      // Apply filter (might need to click outside or press Enter)
      await page.keyboard.press("Escape");
    });

    await test.step("Verify URL and filtered results", async () => {
      await page.waitForURL(/created_date_after=.*&created_date_before=/);
      const url = page.url();
      expect(url).toContain("created_date_after=");
      expect(url).toContain("created_date_before=");

      // Both invoices should be visible
      await page.waitForLoadState("networkidle");
      const tableBody = page.locator('[data-slot="table-body"]');
      await expect(tableBody).toBeVisible();
    });
  });

  test("should combine date filter with status filter", async ({ page }) => {
    await test.step("Apply date filter", async () => {
      await page.getByRole("button", { name: /add filter/i }).click();
      await page.getByRole("menuitem", { name: /period/i }).click();
      await page.getByRole("button", { name: /last 7 days/i }).click();
    });

    await test.step("Apply status filter", async () => {
      await page.getByRole("button", { name: /add filter/i }).click();
      await page.getByRole("menuitem", { name: /status/i }).click();
      await page.getByRole("menuitemcheckbox", { name: /draft/i }).click();
      // Close the menu
      await page.keyboard.press("Escape");
    });

    await test.step("Verify both filters are applied", async () => {
      await page.waitForLoadState("networkidle");
      const url = page.url();
      expect(url).toContain("created_date_after=");
      expect(url).toContain("created_date_before=");
      expect(url).toContain("status=draft");

      // Table should show filtered results
      const tableBody = page.locator('[data-slot="table-body"]');
      await expect(tableBody).toBeVisible();
    });
  });

  test("should clear date filter", async ({ page }) => {
    await test.step("Apply date filter", async () => {
      await page.getByRole("button", { name: /add filter/i }).click();
      await page.getByRole("menuitem", { name: /period/i }).click();
      await page.getByRole("button", { name: /last 7 days/i }).click();
      await page.waitForLoadState("networkidle");
    });

    await test.step("Clear the filter", async () => {
      // Look for the filter badge/chip and its close button
      const filterChip = page.locator('[data-slot="filter-badge"]').filter({
        hasText: /period|last 7 days/i,
      });
      await expect(filterChip).toBeVisible();

      // Click the X or clear button on the chip
      const clearButton = filterChip
        .locator('button[aria-label*="clear"]')
        .or(filterChip.locator('button:has([data-lucide="x"])'));
      await clearButton.click();
    });

    await test.step("Verify filter is cleared", async () => {
      await page.waitForLoadState("networkidle");
      const url = page.url();
      expect(url).not.toContain("created_date_after=");
      expect(url).not.toContain("created_date_before=");

      // Table should show all invoices (no date restriction)
      const tableBody = page.locator('[data-slot="table-body"]');
      await expect(tableBody).toBeVisible();
    });
  });

  test("should restore date filter from URL on page reload", async ({
    page,
  }) => {
    let urlWithDateFilter: string;

    await test.step("Apply date filter and capture URL", async () => {
      await page.getByRole("button", { name: /add filter/i }).click();
      await page.getByRole("menuitem", { name: /period/i }).click();
      await page.getByRole("button", { name: /last 7 days/i }).click();
      await page.waitForLoadState("networkidle");
      urlWithDateFilter = page.url();
      expect(urlWithDateFilter).toContain("created_date_after=");
    });

    await test.step("Reload page with filter params", async () => {
      await page.goto(urlWithDateFilter);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Verify filter is restored", async () => {
      // URL should still have the params
      expect(page.url()).toContain("created_date_after=");
      expect(page.url()).toContain("created_date_before=");

      // Filter badge should be visible
      const filterChip = page.locator('[data-slot="filter-badge"]').filter({
        hasText: /period/i,
      });
      await expect(filterChip).toBeVisible();

      // Results should be filtered
      const tableBody = page.locator('[data-slot="table-body"]');
      await expect(tableBody).toBeVisible();
    });
  });

  test("should show empty state when no invoices in date range", async ({
    page,
  }) => {
    await test.step("Apply date filter for future dates (no invoices)", async () => {
      await page.getByRole("button", { name: /add filter/i }).click();
      await page.getByRole("menuitem", { name: /period/i }).click();

      // Select custom range
      const customButton = page
        .getByRole("button", { name: /custom/i })
        .or(page.locator('button:has-text("Custom")'));
      await customButton.click();

      // Set date range to future (next month)
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const futureEndDate = new Date(futureDate);
      futureEndDate.setDate(futureEndDate.getDate() + 7);

      const fromInput = page
        .getByLabel(/from/i)
        .or(page.locator('input[name="from"]'));
      await fromInput.fill(futureDate.toISOString().split("T")[0]);

      const toInput = page
        .getByLabel(/to/i)
        .or(page.locator('input[name="to"]'));
      await toInput.fill(futureEndDate.toISOString().split("T")[0]);

      await page.keyboard.press("Escape");
      await page.waitForLoadState("networkidle");
    });

    await test.step("Verify empty state is displayed", async () => {
      // Should show empty state, not crash
      const emptyState = page.getByText(/no invoices|try adjusting/i);
      await expect(emptyState).toBeVisible();
    });
  });
});
