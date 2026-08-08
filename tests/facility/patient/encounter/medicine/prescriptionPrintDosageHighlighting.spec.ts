import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { format, subDays } from "date-fns";
import { getFacilityId } from "tests/support/facilityId";
import {
  frequencies,
  instructions,
  medicineNames,
} from "./prescriptionTestData";

test.use({ storageState: "tests/.auth/user.json" });

test.describe("Prescription Print Dosage Highlighting", () => {
  test.describe.configure({ mode: "serial" });
  let facilityId: string;

  test.beforeEach(async ({ page }) => {
    facilityId = getFacilityId();
    const createdDateAfter = format(subDays(new Date(), 90), "yyyy-MM-dd");
    const createdDateBefore = format(new Date(), "yyyy-MM-dd");
    await page.goto(
      `/facility/${facilityId}/encounters/patients/all?created_date_after=${createdDateAfter}&created_date_before=${createdDateBefore}&status=in_progress`,
    );
    await page.getByText("View Encounter").first().click();
    await page.getByRole("tab", { name: "Medicines" }).click();
  });

  test("Non-unit dosage is highlighted with bold and asterisk in print preview", async ({
    page,
  }) => {
    const medicineName = faker.helpers.arrayElement(medicineNames);
    // Use a non-unit dose (value !== 1) so the dosage is highlighted
    const dosage = faker.number.int({ min: 2, max: 10 }).toString();
    const frequency = faker.helpers.arrayElement(frequencies);
    const selectedInstruction = faker.helpers.arrayElement(instructions);

    await test.step("Create prescription with non-unit dosage", async () => {
      await page.getByRole("link", { name: /Create/i }).click();
      await expect(
        page.getByText(/Add Medication|Add another Medication/i),
      ).toBeVisible();
      await page.getByText(/Add Medication|Add another Medication/i).click();

      await page.getByRole("tab", { name: "Medication" }).click();
      await page.locator("input[data-slot='command-input']").fill(medicineName);
      await page.getByRole("option", { name: medicineName }).first().click();
      await expect(page.getByText(medicineName).first()).toBeVisible();

      await page.getByPlaceholder("Enter a number...").first().click();
      await page.getByPlaceholder("Enter a number...").first().fill(dosage);
      await page.keyboard.press("Enter");

      await page.getByText("eg. 1-0-1").first().click();
      await page.getByPlaceholder("Type eg. 1-0-1").fill(frequency.input);
      await page
        .getByRole("option", { name: frequency.display })
        .nth(0)
        .click();

      await page.getByTitle("Show Advanced Fields").first().click();
      await page
        .getByRole("button", { name: "No instructions selected" })
        .last()
        .click();
      await page.getByRole("option", { name: selectedInstruction }).click();

      await page.getByRole("button", { name: "Submit" }).click();
      await expect(
        page
          .locator("li[data-sonner-toast]")
          .getByText("Questionnaire submitted successfully"),
      ).toBeVisible();
    });

    await test.step("Open print preview", async () => {
      await page.getByRole("tab", { name: "Medicines" }).click();
      await page.waitForTimeout(1000); // Wait for data to load
      // Open the most recent prescription (first in list)
      await page
        .locator("li[data-slot='card']")
        .filter({ hasText: "Prescription" })
        .first()
        .click();
      // Open print preview
      await page.getByRole("button", { name: "Print" }).click();
      await expect(page.getByText("Prescription Print Preview")).toBeVisible();
    });

    await test.step("Verify non-unit dosage has bold and asterisk in print", async () => {
      const printPreview = page.locator("[data-slot='print-preview']");
      await expect(printPreview).toBeVisible();

      // Look for the dosage cell in the table
      const table = printPreview.getByRole("table");
      await expect(table).toBeVisible();
      await expect(table).toContainText(medicineName);

      // Non-unit dosages should have asterisk indicator
      const dosagePattern = new RegExp(`${dosage}.*\\*`);
      await expect(table.getByText(dosagePattern)).toBeVisible();

      // The dosage should be in a bold/extrabold element
      const medicationRow = table.getByRole("row").filter({
        hasText: medicineName,
      });
      const boldDosage = medicationRow.locator(".font-extrabold, .font-bold");
      await expect(boldDosage).toContainText(dosage);
    });
  });

  test("Unit dosage (1) is not highlighted in print preview", async ({
    page,
  }) => {
    const medicineName = faker.helpers.arrayElement(medicineNames);
    const dosage = "1";
    const frequency = faker.helpers.arrayElement(frequencies);
    const selectedInstruction = faker.helpers.arrayElement(instructions);

    await test.step("Create prescription with unit dosage", async () => {
      await page.getByRole("link", { name: /Create/i }).click();
      await expect(
        page.getByText(/Add Medication|Add another Medication/i),
      ).toBeVisible();
      await page.getByText(/Add Medication|Add another Medication/i).click();

      await page.getByRole("tab", { name: "Medication" }).click();
      await page.locator("input[data-slot='command-input']").fill(medicineName);
      await page.getByRole("option", { name: medicineName }).first().click();
      await expect(page.getByText(medicineName).first()).toBeVisible();

      await page.getByPlaceholder("Enter a number...").first().click();
      await page.getByPlaceholder("Enter a number...").first().fill(dosage);
      await page.keyboard.press("Enter");

      await page.getByText("eg. 1-0-1").first().click();
      await page.getByPlaceholder("Type eg. 1-0-1").fill(frequency.input);
      await page
        .getByRole("option", { name: frequency.display })
        .nth(0)
        .click();

      await page.getByTitle("Show Advanced Fields").first().click();
      await page
        .getByRole("button", { name: "No instructions selected" })
        .last()
        .click();
      await page.getByRole("option", { name: selectedInstruction }).click();

      await page.getByRole("button", { name: "Submit" }).click();
      await expect(
        page
          .locator("li[data-sonner-toast]")
          .getByText("Questionnaire submitted successfully"),
      ).toBeVisible();
    });

    await test.step("Open print preview", async () => {
      await page.getByRole("tab", { name: "Medicines" }).click();
      await page.waitForTimeout(1000); // Wait for data to load
      // Open the most recent prescription (first in list)
      await page
        .locator("li[data-slot='card']")
        .filter({ hasText: "Prescription" })
        .first()
        .click();
      // Open print preview
      await page.getByRole("button", { name: "Print" }).click();
      await expect(page.getByText("Prescription Print Preview")).toBeVisible();
    });

    await test.step("Verify unit dosage has no asterisk or bold in print", async () => {
      const printPreview = page.locator("[data-slot='print-preview']");
      await expect(printPreview).toBeVisible();

      const table = printPreview.getByRole("table");
      await expect(table).toBeVisible();
      await expect(table).toContainText(medicineName);

      // Unit dosages should NOT have asterisk indicator
      const medicationRow = table.getByRole("row").filter({
        hasText: medicineName,
      });
      // The dosage text should be just "1" without asterisk
      await expect(medicationRow).toContainText(/^1\s+tablet$/i);
      // Should not have the asterisk indicator
      const dosageWithAsterisk = new RegExp(`${dosage}.*\\*`);
      await expect(medicationRow.getByText(dosageWithAsterisk)).toHaveCount(0);
    });
  });

  test("Dose range is highlighted in print preview", async ({ page }) => {
    // Note: This test assumes dose range functionality exists in the UI
    // If dose ranges are not yet implemented in the create form, this test
    // would need to be adjusted or skipped until the feature is available
    test.skip(
      true,
      "Dose range creation not yet implemented in prescription UI",
    );
  });
});
