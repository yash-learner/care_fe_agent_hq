import { expect, test } from "@playwright/test";
import { getApiHeaders, getApiUrl } from "tests/helper/utils";
import { getFacilityId } from "tests/support/facilityId";
import { getPatientId } from "tests/support/patientId";

test.use({ storageState: "tests/.auth/user.json" });

interface AccountInfo {
  id: string;
  name: string;
  status: string;
  billing_status: string;
}

interface InvoiceInfo {
  id: string;
  number: string;
  created_date: string;
  status: string;
  account: { id: string; name: string };
}

async function createAccount(
  facilityId: string,
  patientId: string,
  name: string,
): Promise<AccountInfo> {
  const res = await fetch(
    `${getApiUrl()}/api/v1/facility/${facilityId}/account/`,
    {
      method: "POST",
      headers: getApiHeaders(),
      body: JSON.stringify({
        name,
        status: "active",
        billing_status: "pending",
        patient: patientId,
        service_period: { start: new Date().toISOString() },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create account: ${res.status} — ${text}`);
  }
  return (await res.json()) as AccountInfo;
}

async function createInvoice(
  facilityId: string,
  accountId: string,
): Promise<InvoiceInfo> {
  const res = await fetch(
    `${getApiUrl()}/api/v1/facility/${facilityId}/invoice/`,
    {
      method: "POST",
      headers: getApiHeaders(),
      body: JSON.stringify({
        account: accountId,
        status: "draft",
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create invoice: ${res.status} — ${text}`);
  }
  return (await res.json()) as InvoiceInfo;
}

test.describe("Invoice Date Filter", () => {
  let facilityId: string;
  let patientId: string;

  test.beforeAll(() => {
    facilityId = getFacilityId();
    patientId = getPatientId();
  });

  test("should filter invoices by date range", async ({ page }) => {
    // Create multiple invoices to test filtering
    const accountName = `Test Account ${Date.now()}`;
    const account = await createAccount(facilityId, patientId, accountName);

    const invoice1 = await createInvoice(facilityId, account.id);
    const invoice2 = await createInvoice(facilityId, account.id);

    // Navigate to invoice list
    await page.goto(`/facility/${facilityId}/billing/invoices`);

    // Wait for the page to load and show the filter button
    await expect(page.getByRole("button", { name: /filter/i })).toBeVisible();

    // Open the filter menu
    await page.getByRole("button", { name: /filter/i }).click();

    // Wait for the filter menu to be visible
    const filterMenu = page.locator('[role="dialog"], [role="menu"]').last();
    await filterMenu.waitFor({ state: "visible" });

    // Verify the Period filter option exists
    await expect(
      filterMenu.getByRole("button", { name: /period/i }),
    ).toBeVisible();

    // Click on the Period filter
    await filterMenu.getByRole("button", { name: /period/i }).click();

    // Select "Today" option
    await page
      .getByRole("option", { name: /^today$/i })
      .or(page.getByRole("menuitem", { name: /^today$/i }))
      .click();

    // Wait for the page to reload with the filter applied
    await page.waitForLoadState("networkidle");

    // Verify that the URL contains the created_date_after parameter
    await expect(page).toHaveURL(/created_date_after/);

    // Verify the invoices we just created are visible (since they were created today)
    await expect(
      page.getByText(invoice1.number).or(page.getByText(invoice2.number)),
    ).toBeVisible();

    // Verify the filter badge is displayed
    const today = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    await expect(page.getByText(new RegExp(today, "i"))).toBeVisible();
  });

  test("should filter invoices by custom date range", async ({ page }) => {
    // Create an invoice to test filtering
    const accountName = `Test Account ${Date.now()}`;
    const account = await createAccount(facilityId, patientId, accountName);
    await createInvoice(facilityId, account.id);

    // Navigate to invoice list
    await page.goto(`/facility/${facilityId}/billing/invoices`);

    // Open the filter menu
    await page.getByRole("button", { name: /filter/i }).click();

    // Click on the Period filter
    const filterMenu = page.locator('[role="dialog"], [role="menu"]').last();
    await filterMenu.getByRole("button", { name: /period/i }).click();

    // Select "Custom" option to open date picker
    await page
      .getByRole("option", { name: /custom/i })
      .or(page.getByRole("menuitem", { name: /custom/i }))
      .click();

    // Select today's date for both from and to
    const today = new Date();
    const dayOfMonth = today.getDate();

    // Wait for the date picker to be visible
    await page.waitForSelector('[role="dialog"]');

    // Click on today's date (assumes calendar is on current month)
    const dateButton = page
      .getByRole("button", { name: String(dayOfMonth), exact: true })
      .first();
    await dateButton.click();

    // Click again for the end date (or click a different date)
    await dateButton.click();

    // Apply the filter (look for Apply/OK/Done button)
    const applyButton = page
      .getByRole("button", { name: /apply|ok|done/i })
      .last();
    if (await applyButton.isVisible().catch(() => false)) {
      await applyButton.click();
    }

    // Wait for the filter to be applied
    await page.waitForLoadState("networkidle");

    // Verify that the URL contains the date filter parameters
    await expect(page).toHaveURL(/created_date_after/);
    await expect(page).toHaveURL(/created_date_before/);
  });

  test("should clear date filter when clearing all filters", async ({
    page,
  }) => {
    // Navigate directly with a date filter applied
    const today = new Date().toISOString().split("T")[0];
    await page.goto(
      `/facility/${facilityId}/billing/invoices?created_date_after=${today}`,
    );

    // Verify the filter is applied
    await expect(page).toHaveURL(/created_date_after/);

    // Click the "Clear all" button
    await page
      .getByRole("button", { name: /clear all|clear filters/i })
      .click();

    // Wait for the filters to be cleared
    await page.waitForLoadState("networkidle");

    // Verify the date filter is removed from the URL
    await expect(page).not.toHaveURL(/created_date_after/);
  });

  test("should persist date filter via query parameters", async ({ page }) => {
    // Set up date filter parameters
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const tomorrowStr = new Date(today.getTime() + 86400000)
      .toISOString()
      .split("T")[0];

    // Navigate with date filter parameters
    await page.goto(
      `/facility/${facilityId}/billing/invoices?created_date_after=${todayStr}&created_date_before=${tomorrowStr}`,
    );

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Verify the URL still contains the parameters
    await expect(page).toHaveURL(/created_date_after/);
    await expect(page).toHaveURL(/created_date_before/);

    // Get the current URL
    const currentUrl = page.url();

    // Open the same URL in a new context (simulating copy-paste)
    await page.goto(currentUrl);

    // Verify the filters are still applied
    await expect(page).toHaveURL(/created_date_after/);
    await expect(page).toHaveURL(/created_date_before/);
  });

  test("should show invoices with only start date filter", async ({ page }) => {
    // Create an invoice to test filtering
    const accountName = `Test Account ${Date.now()}`;
    const account = await createAccount(facilityId, patientId, accountName);
    const invoice = await createInvoice(facilityId, account.id);

    // Navigate with only start date
    const today = new Date().toISOString().split("T")[0];
    await page.goto(
      `/facility/${facilityId}/billing/invoices?created_date_after=${today}`,
    );

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Verify the invoice created today is visible
    await expect(page.getByText(invoice.number)).toBeVisible();
  });

  test("should show invoices with only end date filter", async ({ page }) => {
    // Create an invoice to test filtering
    const accountName = `Test Account ${Date.now()}`;
    const account = await createAccount(facilityId, patientId, accountName);
    const invoice = await createInvoice(facilityId, account.id);

    // Navigate with only end date (tomorrow, so today's invoices are included)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString();

    await page.goto(
      `/facility/${facilityId}/billing/invoices?created_date_before=${tomorrowStr}`,
    );

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Verify the invoice created today is visible
    await expect(page.getByText(invoice.number)).toBeVisible();
  });

  test("should combine date filter with other filters", async ({ page }) => {
    // Create an invoice to test filtering
    const accountName = `Test Account ${Date.now()}`;
    const account = await createAccount(facilityId, patientId, accountName);
    await createInvoice(facilityId, account.id);

    // Navigate with both date and status filters
    const today = new Date().toISOString().split("T")[0];
    await page.goto(
      `/facility/${facilityId}/billing/invoices?created_date_after=${today}&status=draft`,
    );

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Verify both filters are applied in the URL
    await expect(page).toHaveURL(/created_date_after/);
    await expect(page).toHaveURL(/status=draft/);

    // Verify the filter badges are displayed
    await expect(page.getByText(/draft/i)).toBeVisible();
  });
});
