import { faker } from "@faker-js/faker";
import { expect, Page, test } from "@playwright/test";
import { getFacilityId } from "tests/support/facilityId";
import { createHealthcareService } from "./helpers";

// Use the authenticated state
test.use({ storageState: "tests/.auth/user.json" });

test.describe("Healthcare Service Search", () => {
  let facilityId: string;
  let serviceName1: string;
  let serviceName2: string;
  let serviceName3: string;
  let servicesUrl: string;

  async function createService(page: Page, serviceName: string) {
    await createHealthcareService(page, facilityId, serviceName, servicesUrl);
  }

  test.beforeAll(async ({ browser }) => {
    facilityId = getFacilityId();
    servicesUrl = `/facility/${facilityId}/services/`;

    // Create unique service names for testing
    const uniquePrefix = faker.string.uuid().slice(0, 8);
    serviceName1 = `${uniquePrefix}-Cardiology`;
    serviceName2 = `${uniquePrefix}-Neurology`;
    serviceName3 = `${uniquePrefix}-Orthopedics`;

    const context = await browser.newContext({
      storageState: "tests/.auth/user.json",
    });
    const page = await context.newPage();

    // Create three services for testing
    await createService(page, serviceName1);
    await createService(page, serviceName2);
    await createService(page, serviceName3);

    await page.close();
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(servicesUrl);
  });

  test("should display search input field on page load", async ({ page }) => {
    await test.step("Verify search input is visible", async () => {
      const searchInput = page.getByPlaceholder(
        "Search healthcare services...",
      );
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toHaveAttribute("type", "text");
    });
  });

  test("should filter services by name when searching", async ({ page }) => {
    await test.step("Type search term to filter services", async () => {
      const searchInput = page.getByPlaceholder(
        "Search healthcare services...",
      );
      await searchInput.fill(serviceName1);
    });

    await test.step("Wait for debounced API call and verify filtered results", async () => {
      // Wait for the API response
      await page.waitForResponse(
        (resp) =>
          resp.url().includes("healthcare_service") && resp.status() === 200,
      );

      // Should see the matching service
      await expect(page.getByText(serviceName1)).toBeVisible();

      // Should NOT see the other services
      await expect(page.getByText(serviceName2)).not.toBeVisible();
      await expect(page.getByText(serviceName3)).not.toBeVisible();
    });
  });

  test("should show all services when search input is cleared", async ({
    page,
  }) => {
    await test.step("Enter search term", async () => {
      const searchInput = page.getByPlaceholder(
        "Search healthcare services...",
      );
      await searchInput.fill(serviceName1);
      // Wait for the API response after filling
      await page.waitForResponse(
        (resp) =>
          resp.url().includes("healthcare_service") && resp.status() === 200,
      );
    });

    await test.step("Clear search input", async () => {
      const searchInput = page.getByPlaceholder(
        "Search healthcare services...",
      );
      await searchInput.clear();
      // Wait for the API response after clearing
      await page.waitForResponse(
        (resp) =>
          resp.url().includes("healthcare_service") && resp.status() === 200,
      );
    });

    await test.step("Verify all services are visible again", async () => {
      await expect(page.getByText(serviceName1)).toBeVisible();
      await expect(page.getByText(serviceName2)).toBeVisible();
      await expect(page.getByText(serviceName3)).toBeVisible();
    });
  });

  test("should display empty state for no matching results", async ({
    page,
  }) => {
    await test.step("Search for non-existent service", async () => {
      const searchInput = page.getByPlaceholder(
        "Search healthcare services...",
      );
      const nonExistentName = `nonexistent-service-${faker.string.uuid()}`;
      await searchInput.fill(nonExistentName);
      // Wait for the API response
      await page.waitForResponse(
        (resp) =>
          resp.url().includes("healthcare_service") && resp.status() === 200,
      );
    });

    await test.step("Verify empty state is displayed", async () => {
      await expect(page.getByText("No services found")).toBeVisible();
    });

    await test.step("Verify created services are not visible", async () => {
      await expect(page.getByText(serviceName1)).not.toBeVisible();
      await expect(page.getByText(serviceName2)).not.toBeVisible();
      await expect(page.getByText(serviceName3)).not.toBeVisible();
    });
  });

  test("should persist search term in URL query parameter", async ({
    page,
  }) => {
    const searchTerm = serviceName2;

    await test.step("Enter search term", async () => {
      const searchInput = page.getByPlaceholder(
        "Search healthcare services...",
      );
      await searchInput.fill(searchTerm);
      // Wait for the API response
      await page.waitForResponse(
        (resp) =>
          resp.url().includes("healthcare_service") && resp.status() === 200,
      );
    });

    await test.step("Verify URL contains search query parameter", async () => {
      const url = page.url();
      expect(url).toContain(`search=${encodeURIComponent(searchTerm)}`);
    });

    await test.step("Reload page and verify search persists", async () => {
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Verify search input retains the value
      const searchInput = page.getByPlaceholder(
        "Search healthcare services...",
      );
      await expect(searchInput).toHaveValue(searchTerm);

      // Verify filtered results are still visible
      await expect(page.getByText(serviceName2)).toBeVisible();
      await expect(page.getByText(serviceName1)).not.toBeVisible();
    });
  });

  test("should handle partial search matches", async ({ page }) => {
    // Extract a common substring from the services (the prefix)
    const partialSearch = serviceName1.split("-")[0];

    await test.step("Enter partial search term", async () => {
      const searchInput = page.getByPlaceholder(
        "Search healthcare services...",
      );
      await searchInput.fill(partialSearch);
      // Wait for the API response
      await page.waitForResponse(
        (resp) =>
          resp.url().includes("healthcare_service") && resp.status() === 200,
      );
    });

    await test.step("Verify all services with matching prefix are visible", async () => {
      // All three services should match since they share the same prefix
      await expect(page.getByText(serviceName1)).toBeVisible();
      await expect(page.getByText(serviceName2)).toBeVisible();
      await expect(page.getByText(serviceName3)).toBeVisible();
    });
  });

  test("should handle search with special characters", async ({ page }) => {
    await test.step("Search with special characters", async () => {
      const searchInput = page.getByPlaceholder(
        "Search healthcare services...",
      );
      await searchInput.fill("@#$%^&*()");
      // Wait for the API response
      await page.waitForResponse(
        (resp) =>
          resp.url().includes("healthcare_service") && resp.status() === 200,
      );
    });

    await test.step("Verify empty state or no results", async () => {
      // Should show empty state since no services match special characters
      await expect(page.getByText("No services found")).toBeVisible();
    });
  });

  test("should maintain search state when navigating back", async ({
    page,
  }) => {
    const searchTerm = serviceName1;

    await test.step("Enter search term", async () => {
      const searchInput = page.getByPlaceholder(
        "Search healthcare services...",
      );
      await searchInput.fill(searchTerm);
      // Wait for the API response
      await page.waitForResponse(
        (resp) =>
          resp.url().includes("healthcare_service") && resp.status() === 200,
      );
    });

    await test.step("Navigate to a service detail page", async () => {
      await page.getByText(serviceName1).click();
      await expect(
        page.getByRole("heading", { name: serviceName1 }),
      ).toBeVisible();
    });

    await test.step("Navigate back and verify search persists", async () => {
      await page.goBack();
      await page.waitForLoadState("networkidle");

      // Verify search input retains the value
      const searchInput = page.getByPlaceholder(
        "Search healthcare services...",
      );
      await expect(searchInput).toHaveValue(searchTerm);

      // Verify filtered results are still visible
      await expect(page.getByText(serviceName1)).toBeVisible();
    });
  });
});
