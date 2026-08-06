import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { getFacilityId } from "tests/support/facilityId";
import { createHealthcareService } from "./helpers";

// Use the authenticated state
test.use({ storageState: "tests/.auth/user.json" });

test.describe("Healthcare Services Search", () => {
  let facilityId: string;
  let servicesUrl: string;
  let uniqueServiceName: string;

  test.beforeAll(async ({ browser }) => {
    facilityId = getFacilityId();
    servicesUrl = `/facility/${facilityId}/services`;
    
    // Create a unique service name for testing
    uniqueServiceName = `TestService-${faker.string.uuid().slice(0, 8)}`;
    
    // Create a test service for search testing
    const context = await browser.newContext({
      storageState: "tests/.auth/user.json",
    });
    const page = await context.newPage();
    await createHealthcareService(page, facilityId, uniqueServiceName, servicesUrl);
    await page.close();
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(servicesUrl);
  });

  test("should display search input field on page load", async ({ page }) => {
    // AC-1: Search input field appears on page load
    const searchInput = page.getByPlaceholder("Search healthcare services...");
    await expect(searchInput).toBeVisible();
    
    // Verify search icon is present
    const searchIcon = page.locator('[class*="l-search"]').first();
    await expect(searchIcon).toBeVisible();
  });

  test("should filter services based on search term", async ({ page }) => {
    // AC-3: Matching services are displayed in the list
    
    // Wait for services to load
    await expect(page.getByRole("link", { name: uniqueServiceName })).toBeVisible();
    
    // Type in search input
    const searchInput = page.getByPlaceholder("Search healthcare services...");
    await searchInput.fill(uniqueServiceName);
    
    // Wait for debounce and API response
    await page.waitForTimeout(1000);
    
    // Verify the unique service is visible
    await expect(page.getByRole("link", { name: uniqueServiceName })).toBeVisible();
    
    // Verify URL contains search parameter
    await expect(page).toHaveURL(new RegExp(`search=${encodeURIComponent(uniqueServiceName)}`));
  });

  test("should show empty state when no services match", async ({ page }) => {
    // AC-4: Empty state shows "no_services_found"
    
    const searchInput = page.getByPlaceholder("Search healthcare services...");
    const nonExistentService = `NonExistent-${faker.string.uuid()}`;
    
    await searchInput.fill(nonExistentService);
    
    // Wait for debounce and API response
    await page.waitForTimeout(1000);
    
    // Verify empty state is displayed
    await expect(page.getByText("no_services_found")).toBeVisible();
  });

  test("should display all services when search is cleared", async ({ page }) => {
    // AC-5: Clearing input displays all services again
    
    const searchInput = page.getByPlaceholder("Search healthcare services...");
    
    // First, search for something specific
    await searchInput.fill(uniqueServiceName);
    await page.waitForTimeout(1000);
    
    // Verify filtered results
    await expect(page.getByRole("link", { name: uniqueServiceName })).toBeVisible();
    
    // Clear the search
    await searchInput.clear();
    await page.waitForTimeout(1000);
    
    // Verify all services are shown again (check for fixture services)
    // Pathology Lab should exist in fixtures
    await expect(page.getByText("Pathology Lab")).toBeVisible();
    
    // Verify URL no longer has search parameter
    await expect(page).not.toHaveURL(/search=/);
  });

  test("should persist search term in URL on page refresh", async ({ page }) => {
    // AC-7: Search term persists in URL on page refresh
    
    const searchInput = page.getByPlaceholder("Search healthcare services...");
    
    // Search for the unique service
    await searchInput.fill(uniqueServiceName);
    await page.waitForTimeout(1000);
    
    // Verify search is applied
    await expect(page.getByRole("link", { name: uniqueServiceName })).toBeVisible();
    
    // Get the current URL with search parameter
    const urlWithSearch = page.url();
    expect(urlWithSearch).toContain(`search=${encodeURIComponent(uniqueServiceName)}`);
    
    // Refresh the page
    await page.reload();
    
    // Verify search term is still in the input
    await expect(searchInput).toHaveValue(uniqueServiceName);
    
    // Verify filtered results are still displayed
    await expect(page.getByRole("link", { name: uniqueServiceName })).toBeVisible();
    
    // Verify URL still contains search parameter
    expect(page.url()).toContain(`search=${encodeURIComponent(uniqueServiceName)}`);
  });

  test("should maintain search term when navigating pagination", async ({ page }) => {
    // AC-6: Search term persists with pagination
    // Note: This test requires more than 12 services that match the search term
    // If pagination is not visible, the test will be skipped
    
    const searchInput = page.getByPlaceholder("Search healthcare services...");
    
    // Search for a common term that might yield multiple results
    // Using a partial match that might catch multiple services
    await searchInput.fill("Lab");
    await page.waitForTimeout(1000);
    
    // Check if pagination exists (only if there are more than 12 results)
    const paginationExists = await page.locator('[role="navigation"]').count() > 0;
    
    if (paginationExists) {
      // Verify search term is in URL
      expect(page.url()).toContain("search=Lab");
      
      // Navigate to next page if available
      const nextButton = page.getByRole("button", { name: /next/i });
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        
        // Verify search term persists in URL with page parameter
        expect(page.url()).toContain("search=Lab");
        expect(page.url()).toContain("page=2");
        
        // Verify search input still contains the term
        await expect(searchInput).toHaveValue("Lab");
      }
    } else {
      // Skip pagination test if not enough results
      test.skip();
    }
  });

  test("should debounce search input", async ({ page }) => {
    // AC-2: Search term triggers API call with name parameter (debounced)
    
    const searchInput = page.getByPlaceholder("Search healthcare services...");
    
    // Listen for API requests
    const apiRequests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/healthcare_service/") && url.includes("name=")) {
        apiRequests.push(url);
      }
    });
    
    // Type multiple characters quickly
    await searchInput.fill("P");
    await searchInput.fill("Pa");
    await searchInput.fill("Pat");
    await searchInput.fill("Path");
    
    // Wait a bit for debounce
    await page.waitForTimeout(1500);
    
    // Verify only one or minimal API calls were made (debounced)
    // Should be less than the number of characters typed
    expect(apiRequests.length).toBeLessThanOrEqual(2);
    
    // Verify the final API call includes the complete search term
    const lastRequest = apiRequests[apiRequests.length - 1];
    expect(lastRequest).toContain("name=Path");
  });
});
