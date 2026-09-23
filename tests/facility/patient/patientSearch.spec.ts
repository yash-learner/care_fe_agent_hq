import { expect, test } from "@playwright/test";
import { getFacilityId } from "tests/support/facilityId";

// Use authenticated storage state (admin role)
test.use({ storageState: "tests/.auth/user.json" });

test.describe("Patient Search Result Count", () => {
  let facilityId: string;

  test.beforeEach(async ({ page }) => {
    facilityId = getFacilityId();
    await page.goto(`/facility/${facilityId}/patients`);
  });

  test("AC1 - Identifier search shows correct match count for fixtures", async ({
    page,
  }) => {
    await test.step("Step 1: Navigate to patient search page", async () => {
      await expect(
        page.getByRole("heading", { name: /patient search/i }),
      ).toBeVisible();
    });

    await test.step("Step 2: Verify Patient Identifiers tab is active", async () => {
      await expect(
        page.getByRole("tab", { name: /patient identifiers/i }),
      ).toHaveAttribute("data-state", "active");
    });

    await test.step("Step 3: Select Phone Number from identifier dropdown", async () => {
      await page.getByRole("button", { name: /select identifier/i }).click();
      await page
        .getByRole("menuitem", { name: /phone number/i })
        .first()
        .click();
    });

    await test.step("Step 4: Search for a common phone prefix", async () => {
      // Search for "9" which should match multiple fixture patients
      const searchInput = page.getByRole("textbox", {
        name: /search by phone number/i,
      });
      await searchInput.fill("9");

      // Wait for search results to load
      await page.waitForTimeout(1000); // Debounce delay
    });

    await test.step("Step 5: Verify count line displays with correct count", async () => {
      // Wait for results to appear
      await expect(page.locator("text=/\\d+ results?/")).toBeVisible({
        timeout: 10000,
      });

      // Get the count text
      const countText = await page
        .locator("text=/\\d+ results?/")
        .textContent();
      expect(countText).toMatch(/\d+ results?/);

      // Extract count number
      const countMatch = countText?.match(/(\d+)/);
      const displayedCount = countMatch ? parseInt(countMatch[1], 10) : 0;
      expect(displayedCount).toBeGreaterThan(0);

      // Verify count matches number of table rows
      const tableRows = page.locator("tbody tr");
      const rowCount = await tableRows.count();
      expect(displayedCount).toBe(rowCount);

      // Verify plural form used when count > 1
      if (displayedCount > 1) {
        expect(countText).toContain("results");
      }
    });
  });

  test("AC2 - Identifier search shows empty state for no matches", async ({
    page,
  }) => {
    await test.step("Step 1: Select Phone Number from identifier dropdown", async () => {
      await page.getByRole("button", { name: /select identifier/i }).click();
      await page
        .getByRole("menuitem", { name: /phone number/i })
        .first()
        .click();
    });

    await test.step("Step 2: Search for non-existent phone number", async () => {
      const searchInput = page.getByRole("textbox", {
        name: /search by phone number/i,
      });
      await searchInput.fill("0000000000");

      // Wait for search to complete
      await page.waitForTimeout(1000); // Debounce delay
    });

    await test.step("Step 3: Verify empty state shows without count line", async () => {
      // Wait for empty state to appear
      await expect(page.getByText(/no patient record found/i)).toBeVisible({
        timeout: 10000,
      });

      // Verify no count line is visible
      await expect(page.locator("text=/\\d+ results?/")).not.toBeVisible();

      // Verify empty state elements are present
      await expect(page.getByText(/no patient record found/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /add patient/i }),
      ).toBeVisible();
    });
  });

  test("AC3 - No count line shown before search is typed", async ({ page }) => {
    await test.step("Step 1: Verify page loads with empty search", async () => {
      await expect(
        page.getByRole("heading", { name: /patient search/i }),
      ).toBeVisible();
    });

    await test.step("Step 2: Verify search input is empty", async () => {
      // Select an identifier first to make the search input visible
      await page.getByRole("button", { name: /select identifier/i }).click();
      await page
        .getByRole("menuitem", { name: /phone number/i })
        .first()
        .click();

      const searchInput = page.getByRole("textbox", {
        name: /search by phone number/i,
      });
      await expect(searchInput).toHaveValue("");
    });

    await test.step("Step 3: Verify no count line is visible", async () => {
      // No count line should be visible
      await expect(page.locator("text=/\\d+ results?/")).not.toBeVisible();

      // No results table should be visible
      await expect(page.locator("table tbody tr")).toHaveCount(0);

      // No empty state should be visible
      await expect(
        page.getByText(/no patient record found/i),
      ).not.toBeVisible();
    });
  });

  test("AC4 - Encounter search shows correct match count from encounterList.count", async ({
    page,
  }) => {
    await test.step("Step 1: Switch to Encounters tab", async () => {
      await page.getByRole("tab", { name: /encounters/i }).click();
      await expect(
        page.getByRole("tab", { name: /encounters/i }),
      ).toHaveAttribute("data-state", "active");
    });

    await test.step("Step 2: Select Patient Name from search dropdown", async () => {
      await page.getByRole("button", { name: /select search type/i }).click();
      await page.getByRole("menuitem", { name: /patient name/i }).click();
    });

    await test.step("Step 3: Search for a common patient name", async () => {
      const searchInput = page.getByRole("textbox", {
        name: /search by patient name/i,
      });
      // Search for a partial name that should match fixtures
      await searchInput.fill("Test");

      // Wait for search results to load
      await page.waitForTimeout(1000); // Debounce delay
    });

    await test.step("Step 4: Verify count line displays with API count", async () => {
      // Wait for results to appear
      await expect(page.locator("text=/\\d+ results?/")).toBeVisible({
        timeout: 10000,
      });

      // Get the count text
      const countText = await page
        .locator("text=/\\d+ results?/")
        .textContent();
      expect(countText).toMatch(/\d+ results?/);

      // Extract count number
      const countMatch = countText?.match(/(\d+)/);
      const displayedCount = countMatch ? parseInt(countMatch[1], 10) : 0;
      expect(displayedCount).toBeGreaterThan(0);

      // Note: For encounters, count comes from encounterList.count which may be
      // higher than visible rows if results are paginated
      const tableRows = page.locator("tbody tr");
      const rowCount = await tableRows.count();
      expect(rowCount).toBeGreaterThan(0);
      expect(displayedCount).toBeGreaterThanOrEqual(rowCount);
    });
  });

  test("AC5 - Encounter search shows empty state for no matches", async ({
    page,
  }) => {
    await test.step("Step 1: Switch to Encounters tab", async () => {
      await page.getByRole("tab", { name: /encounters/i }).click();
      await expect(
        page.getByRole("tab", { name: /encounters/i }),
      ).toHaveAttribute("data-state", "active");
    });

    await test.step("Step 2: Select Patient Name from search dropdown", async () => {
      await page.getByRole("button", { name: /select search type/i }).click();
      await page.getByRole("menuitem", { name: /patient name/i }).click();
    });

    await test.step("Step 3: Search for non-existent patient name", async () => {
      const searchInput = page.getByRole("textbox", {
        name: /search by patient name/i,
      });
      await searchInput.fill("zzz-no-such-patient-xyz");

      // Wait for search to complete
      await page.waitForTimeout(1000); // Debounce delay
    });

    await test.step("Step 4: Verify empty state shows without count line", async () => {
      // Wait for empty state to appear
      await expect(page.getByText(/no patient record found/i)).toBeVisible({
        timeout: 10000,
      });

      // Verify no count line is visible
      await expect(page.locator("text=/\\d+ results?/")).not.toBeVisible();

      // Verify empty state elements are present
      await expect(page.getByText(/no patient record found/i)).toBeVisible();
    });
  });

  test("AC6 - Count updates live when search term changes", async ({
    page,
  }) => {
    await test.step("Step 1: Select Phone Number and perform initial search", async () => {
      await page.getByRole("button", { name: /select identifier/i }).click();
      await page
        .getByRole("menuitem", { name: /phone number/i })
        .first()
        .click();

      const searchInput = page.getByRole("textbox", {
        name: /search by phone number/i,
      });
      await searchInput.fill("9");

      // Wait for initial results
      await page.waitForTimeout(1000); // Debounce delay
    });

    await test.step("Step 2: Verify initial count is displayed", async () => {
      await expect(page.locator("text=/\\d+ results?/")).toBeVisible({
        timeout: 10000,
      });

      const initialCountText = await page
        .locator("text=/\\d+ results?/")
        .textContent();
      const initialMatch = initialCountText?.match(/(\d+)/);
      const initialCount = initialMatch ? parseInt(initialMatch[1], 10) : 0;
      expect(initialCount).toBeGreaterThan(0);
    });

    await test.step("Step 3: Modify search term to be more specific", async () => {
      const searchInput = page.getByRole("textbox", {
        name: /search by phone number/i,
      });
      await searchInput.fill("91");

      // Wait for updated results
      await page.waitForTimeout(1000); // Debounce delay
    });

    await test.step("Step 4: Verify count updates without page reload", async () => {
      // Verify URL hasn't changed (no page reload)
      expect(page.url()).toContain(`/facility/${facilityId}/patients`);

      // Verify count line is still visible (may have updated count)
      await expect(page.locator("text=/\\d+ results?/")).toBeVisible({
        timeout: 10000,
      });

      const updatedCountText = await page
        .locator("text=/\\d+ results?/")
        .textContent();
      expect(updatedCountText).toMatch(/\d+ results?/);
    });

    await test.step("Step 5: Clear search and verify count disappears", async () => {
      const searchInput = page.getByRole("textbox", {
        name: /search by phone number/i,
      });
      await searchInput.clear();

      // Wait for clear to take effect
      await page.waitForTimeout(1000);

      // Verify count line is no longer visible
      await expect(page.locator("text=/\\d+ results?/")).not.toBeVisible();

      // Verify no results table is visible
      await expect(page.locator("table tbody tr")).toHaveCount(0);
    });
  });
});
