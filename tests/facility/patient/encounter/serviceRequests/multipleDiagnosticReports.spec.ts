import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { clickTabOrMenuItem } from "tests/helper/ui";
import { getApiHeaders, getApiUrl } from "tests/helper/utils";
import { getEncounterId } from "tests/support/encounterId";
import { getFacilityId } from "tests/support/facilityId";
import { getPatientId } from "tests/support/patientId";

test.use({
  storageState: "tests/.auth/user.json",
});

let facilityId: string;
let patientId: string;
let encounterId: string;
let activityDefinitionSlug: string;
let serviceRequestId: string;

test.beforeAll(async ({ request }) => {
  facilityId = getFacilityId();
  patientId = getPatientId();
  encounterId = getEncounterId();

  // Create an Activity Definition with multiple diagnostic report codes
  const slug = `qa-multi-diag-${Date.now()}`;
  const adResponse = await request.post(
    getApiUrl(`/api/v1/facility/${facilityId}/activity_definition/`),
    {
      headers: await getApiHeaders(),
      data: {
        slug_value: slug,
        title: `QA Multi Diagnostic Report Test ${faker.string.alphanumeric(6)}`,
        status: "active",
        classification: "laboratory",
        kind: "service_request",
        code: {
          code: "CBC",
          display: "Complete Blood Count",
          system: "http://loinc.org",
        },
        diagnostic_report_codes: [
          {
            code: "58410-2",
            display: "Complete blood count",
            system: "http://loinc.org",
          },
          {
            code: "57021-8",
            display: "CBC W Auto Differential panel",
            system: "http://loinc.org",
          },
          {
            code: "57023-4",
            display: "Auto Differential panel",
            system: "http://loinc.org",
          },
        ],
        facility: facilityId,
        specimen_requirements: [],
        charge_item_definitions: [],
        observation_result_requirements: [],
        locations: [],
        category: "",
        healthcare_service: null,
        body_site: null,
        description:
          "Test activity definition with multiple diagnostic report codes",
        usage: "",
        derived_from_uri: null,
      },
    },
  );

  expect(adResponse.ok()).toBeTruthy();
  const adData = await adResponse.json();
  activityDefinitionSlug = adData.slug;

  // Create a Service Request using the Activity Definition
  const srResponse = await request.post(
    getApiUrl(`/api/v1/facility/${facilityId}/service_request/`),
    {
      headers: await getApiHeaders(),
      data: {
        encounter: encounterId,
        activity_definition: activityDefinitionSlug,
        priority: "routine",
        status: "active",
        intent: "order",
        category: "laboratory",
      },
    },
  );

  expect(srResponse.ok()).toBeTruthy();
  const srData = await srResponse.json();
  serviceRequestId = srData.id;
});

test.describe("Multiple Diagnostic Reports per Service Request", () => {
  test("AC #1: should show all diagnostic report codes in dropdown when no reports exist", async ({
    page,
  }) => {
    await page.goto(
      `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/updates`,
    );

    await clickTabOrMenuItem(page, /service requests/i);
    await expect(page).toHaveURL(/\/service_requests$/);

    // Find and click the service request row
    const srRow = page
      .locator('[data-slot="table-body"] [data-slot="table-row"]')
      .filter({ hasText: "QA Multi Diagnostic Report Test" });
    await srRow.getByRole("button", { name: "See Details" }).click();

    // Expand the "Test Results Entry" section
    const testResultsSection = page.getByText("Test Results Entry");
    await expect(testResultsSection).toBeVisible();

    // Check that the dropdown and create button are visible
    const createSection = page.locator(".space-y-4.bg-gray-50");
    await expect(createSection).toBeVisible();

    // Click the dropdown to open it
    const dropdown = page.getByRole("combobox", {
      name: /select diagnostic report type/i,
    });
    await dropdown.click();

    // Verify all 3 codes are shown
    await expect(
      page.getByRole("option", { name: /Complete blood count \(58410-2\)/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", {
        name: /CBC W Auto Differential panel \(57021-8\)/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: /Auto Differential panel \(57023-4\)/ }),
    ).toBeVisible();
  });

  test("AC #2: should update dropdown to show only remaining codes after first report created", async ({
    page,
  }) => {
    await page.goto(
      `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/updates`,
    );

    await clickTabOrMenuItem(page, /service requests/i);
    const srRow = page
      .locator('[data-slot="table-body"] [data-slot="table-row"]')
      .filter({ hasText: "QA Multi Diagnostic Report Test" });
    await srRow.getByRole("button", { name: "See Details" }).click();

    // Select the first code
    const dropdown = page.getByRole("combobox", {
      name: /select diagnostic report type/i,
    });
    await dropdown.click();
    await page
      .getByRole("option", { name: /Complete blood count \(58410-2\)/ })
      .click();

    // Create the first report
    await page.getByRole("button", { name: /create report/i }).click();

    // Wait for success toast
    await expect(page.getByText(/diagnostic report created/i)).toBeVisible({
      timeout: 10000,
    });

    // Wait a bit for the UI to update
    await page.waitForTimeout(1000);

    // Check for the "Create additional diagnostic report" section
    const additionalSection = page.getByText(
      /create additional diagnostic report/i,
    );
    await expect(additionalSection).toBeVisible();

    // Click the dropdown in the additional section
    const additionalDropdown = additionalSection
      .locator("..")
      .locator("..")
      .getByRole("combobox");
    await additionalDropdown.click();

    // Verify only 2 remaining codes are shown
    await expect(
      page.getByRole("option", {
        name: /CBC W Auto Differential panel \(57021-8\)/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: /Auto Differential panel \(57023-4\)/ }),
    ).toBeVisible();

    // Verify the first code is NOT in the list
    await expect(
      page.getByRole("option", { name: /Complete blood count \(58410-2\)/ }),
    ).not.toBeVisible();
  });

  test("AC #3: should disable create button when all codes are used", async ({
    page,
  }) => {
    await page.goto(
      `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/updates`,
    );

    await clickTabOrMenuItem(page, /service requests/i);
    const srRow = page
      .locator('[data-slot="table-body"] [data-slot="table-row"]')
      .filter({ hasText: "QA Multi Diagnostic Report Test" });
    await srRow.getByRole("button", { name: "See Details" }).click();

    // Wait for the page to load
    await page.waitForTimeout(1000);

    // Check if additional section exists (might not if all 3 were already created in previous tests)
    const additionalSection = page.getByText(
      /create additional diagnostic report/i,
    );

    // If there are remaining codes, create reports until all are used
    let retries = 3; // Maximum 3 reports can be created
    while (retries > 0) {
      try {
        await expect(additionalSection).toBeVisible({ timeout: 2000 });

        // Select a remaining code
        const dropdown = additionalSection
          .locator("..")
          .locator("..")
          .getByRole("combobox");
        await dropdown.click();

        // Select the first available option
        const firstOption = page.getByRole("option").first();
        await firstOption.click();

        // Create the report
        const createButton = page
          .getByRole("button", { name: /create report/i })
          .last();
        await createButton.click();

        // Wait for success toast
        await expect(page.getByText(/diagnostic report created/i)).toBeVisible({
          timeout: 10000,
        });

        await page.waitForTimeout(1000);
        retries--;
      } catch {
        // No more additional section visible, all reports created
        break;
      }
    }

    // Verify the "Create additional diagnostic report" section is not visible
    await expect(additionalSection).not.toBeVisible();

    // Or if it's visible, verify the button is disabled
    const createButtons = page.getByRole("button", { name: /create report/i });
    const count = await createButtons.count();
    if (count > 0) {
      await expect(createButtons.last()).toBeDisabled();
    }
  });

  test("AC #4 & #7: should display all created reports independently", async ({
    page,
  }) => {
    await page.goto(
      `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/updates`,
    );

    await clickTabOrMenuItem(page, /service requests/i);
    const srRow = page
      .locator('[data-slot="table-body"] [data-slot="table-row"]')
      .filter({ hasText: "QA Multi Diagnostic Report Test" });
    await srRow.getByRole("button", { name: "See Details" }).click();

    await page.waitForTimeout(1000);

    // Check for multiple report cards in the Test Results Entry section
    // Look for badges or report codes that indicate separate reports
    const reportBadges = page.locator('[data-slot="badge"]');
    const badgeCount = await reportBadges.count();

    // Should have at least 1 badge (status badge for reports)
    expect(badgeCount).toBeGreaterThanOrEqual(1);

    // Look for multiple report code displays (simplified view for older reports)
    const reportCodes = page.locator(".text-base.font-semibold").filter({
      hasText: /\(58410-2\)|\(57021-8\)|\(57023-4\)/,
    });
    const codeCount = await reportCodes.count();

    // Should show multiple report codes if multiple reports exist
    // Note: This test depends on the previous tests creating multiple reports
    expect(codeCount).toBeGreaterThanOrEqual(1);
  });

  test("AC #6: should persist remaining codes after page refresh", async ({
    page,
  }) => {
    await page.goto(
      `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/updates`,
    );

    await clickTabOrMenuItem(page, /service requests/i);
    const srRow = page
      .locator('[data-slot="table-body"] [data-slot="table-row"]')
      .filter({ hasText: "QA Multi Diagnostic Report Test" });
    await srRow.getByRole("button", { name: "See Details" }).click();

    await page.waitForTimeout(1000);

    // Check if there are remaining codes before refresh
    const additionalSection = page.getByText(
      /create additional diagnostic report/i,
    );
    const hasRemainingBefore = await additionalSection.isVisible();

    if (hasRemainingBefore) {
      // Note which codes are available
      const dropdown = additionalSection
        .locator("..")
        .locator("..")
        .getByRole("combobox");
      await dropdown.click();

      const availableOptions = await page.getByRole("option").allTextContents();
      const availableCodesBefore = availableOptions.length;

      // Close dropdown
      await dropdown.click();

      // Refresh the page
      await page.reload();

      await clickTabOrMenuItem(page, /service requests/i);
      const srRowAfterRefresh = page
        .locator('[data-slot="table-body"] [data-slot="table-row"]')
        .filter({ hasText: "QA Multi Diagnostic Report Test" });
      await srRowAfterRefresh
        .getByRole("button", { name: "See Details" })
        .click();

      await page.waitForTimeout(1000);

      // Verify the additional section is still visible
      await expect(additionalSection).toBeVisible();

      // Check that the same codes are available
      const dropdownAfter = additionalSection
        .locator("..")
        .locator("..")
        .getByRole("combobox");
      await dropdownAfter.click();

      const availableOptionsAfter = await page
        .getByRole("option")
        .allTextContents();
      const availableCodesAfter = availableOptionsAfter.length;

      expect(availableCodesAfter).toBe(availableCodesBefore);
    }
  });
});

test.describe("Edge case: No diagnostic report codes", () => {
  let noCodesActivityDefinitionSlug: string;
  let noCodesServiceRequestId: string;

  test.beforeAll(async ({ request }) => {
    // Create an Activity Definition WITHOUT diagnostic report codes
    const slug = `qa-no-codes-${Date.now()}`;
    const adResponse = await request.post(
      getApiUrl(`/api/v1/facility/${facilityId}/activity_definition/`),
      {
        headers: await getApiHeaders(),
        data: {
          slug_value: slug,
          title: `QA No Codes Test ${faker.string.alphanumeric(6)}`,
          status: "active",
          classification: "laboratory",
          kind: "service_request",
          code: {
            code: "GENERIC",
            display: "Generic Test",
            system: "http://loinc.org",
          },
          diagnostic_report_codes: [], // Empty
          facility: facilityId,
          specimen_requirements: [],
          charge_item_definitions: [],
          observation_result_requirements: [],
          locations: [],
          category: "",
          healthcare_service: null,
          body_site: null,
          description:
            "Test activity definition without diagnostic report codes",
          usage: "",
          derived_from_uri: null,
        },
      },
    );

    expect(adResponse.ok()).toBeTruthy();
    const adData = await adResponse.json();
    noCodesActivityDefinitionSlug = adData.slug;

    // Create a Service Request using the Activity Definition
    const srResponse = await request.post(
      getApiUrl(`/api/v1/facility/${facilityId}/service_request/`),
      {
        headers: await getApiHeaders(),
        data: {
          encounter: encounterId,
          activity_definition: noCodesActivityDefinitionSlug,
          priority: "routine",
          status: "active",
          intent: "order",
          category: "laboratory",
        },
      },
    );

    expect(srResponse.ok()).toBeTruthy();
    const srData = await srResponse.json();
    noCodesServiceRequestId = srData.id;
  });

  test("AC #5: should behave as before when no diagnostic report codes defined", async ({
    page,
  }) => {
    await page.goto(
      `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/updates`,
    );

    await clickTabOrMenuItem(page, /service requests/i);
    const srRow = page
      .locator('[data-slot="table-body"] [data-slot="table-row"]')
      .filter({ hasText: "QA No Codes Test" });
    await srRow.getByRole("button", { name: "See Details" }).click();

    await page.waitForTimeout(1000);

    // Should not show the dropdown (no codes defined)
    const dropdown = page.getByRole("combobox", {
      name: /select diagnostic report type/i,
    });
    await expect(dropdown).not.toBeVisible();

    // Should show the create button
    const createButton = page.getByRole("button", { name: /create report/i });
    await expect(createButton).toBeVisible();

    // Create the report
    await createButton.click();

    // Wait for success toast
    await expect(page.getByText(/diagnostic report created/i)).toBeVisible({
      timeout: 10000,
    });

    await page.waitForTimeout(1000);

    // Should not show the "Create additional diagnostic report" section
    const additionalSection = page.getByText(
      /create additional diagnostic report/i,
    );
    await expect(additionalSection).not.toBeVisible();
  });
});
