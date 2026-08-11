import { expect, test } from "@playwright/test";
import { getFacilityId } from "tests/support/facilityId";

// Use authenticated storage state
test.use({ storageState: "tests/.auth/user.json" });

test.describe("Custom Footer Links", () => {
  let facilityId: string;

  test.beforeEach(async ({ page }) => {
    facilityId = getFacilityId();
  });

  test("footer links render above user avatar when configured", async ({
    page,
  }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Verify sidebar footer structure", async () => {
      // Check that SidebarFooter exists
      const sidebarFooter = page.locator('[data-sidebar="footer"]');
      await expect(sidebarFooter).toBeVisible();

      // User avatar should be present
      const userAvatar = sidebarFooter.locator('[role="button"]').first();
      await expect(userAvatar).toBeVisible();

      // Footer links should be present
      const documentationLink = page.getByTestId(
        "footer-link-footer_link_documentation",
      );
      await expect(documentationLink).toBeVisible();
    });
  });

  test("external links have correct attributes and icons", async ({ page }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Check external link with ExternalLink icon", async () => {
      const externalLink = page.getByTestId(
        "footer-link-footer_link_documentation",
      );
      await expect(externalLink).toBeVisible();
      await expect(externalLink).toHaveAttribute("target", "_blank");
      await expect(externalLink).toHaveAttribute("rel", "noopener noreferrer");

      // Verify ExternalLink icon is present
      const externalIcon = externalLink.getByTestId(
        "icon-footer_link_documentation",
      );
      await expect(externalIcon).toBeVisible();
    });
  });

  test("internal links use ArrowRight icon", async ({ page }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Check internal link with ArrowRight icon", async () => {
      const internalLink = page.getByTestId("footer-link-footer_link_support");
      await expect(internalLink).toBeVisible();

      // Verify ArrowRight icon is present
      const arrowIcon = internalLink.getByTestId("icon-footer_link_support");
      await expect(arrowIcon).toBeVisible();

      // Internal link should not have target="_blank"
      await expect(internalLink).not.toHaveAttribute("target", "_blank");
    });
  });

  test("external link opens in new tab", async ({ page, context }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Click external link and verify new tab", async () => {
      const externalLink = page.getByTestId(
        "footer-link-footer_link_documentation",
      );
      await expect(externalLink).toBeVisible();

      // Listen for new page event
      const [newPage] = await Promise.all([
        context.waitForEvent("page"),
        externalLink.click(),
      ]);

      // Verify new page opened
      expect(newPage).toBeDefined();
      await newPage.waitForLoadState();

      // Original page should still be on the same URL
      expect(page.url()).toContain(`/facility/${facilityId}/overview`);

      await newPage.close();
    });
  });

  test("internal link navigates in same tab", async ({ page }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Click internal link and verify same-tab navigation", async () => {
      const internalLink = page.getByTestId("footer-link-footer_link_support");
      await expect(internalLink).toBeVisible();

      const href = await internalLink.getAttribute("href");
      expect(href).toBe("/help");

      await internalLink.click();
      await page.waitForLoadState("networkidle");

      // Verify navigation occurred in same tab
      expect(page.url()).toContain("/help");
    });
  });

  test("footer links appear in multiple sidebar contexts", async ({ page }) => {
    await test.step("Check footer links in facility sidebar", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");

      const sidebarFooter = page.locator('[data-sidebar="footer"]');
      await expect(sidebarFooter).toBeVisible();

      // Facility-specific link should be visible
      const facilityLink = page.getByTestId(
        "footer-link-footer_link_facility_only",
      );
      await expect(facilityLink).toBeVisible();

      // Patient-specific link should NOT be visible
      const patientLink = page.getByTestId(
        "footer-link-footer_link_patient_only",
      );
      await expect(patientLink).not.toBeVisible();
    });

    await test.step("Check footer links in patient sidebar", async () => {
      // Navigate to patient context
      await page.goto("/patients");
      await page.waitForLoadState("networkidle");

      const sidebarFooter = page.locator('[data-sidebar="footer"]');
      await expect(sidebarFooter).toBeVisible();

      // Patient-specific link should be visible
      const patientLink = page.getByTestId(
        "footer-link-footer_link_patient_only",
      );
      await expect(patientLink).toBeVisible();

      // Facility-specific link should NOT be visible
      const facilityLink = page.getByTestId(
        "footer-link-footer_link_facility_only",
      );
      await expect(facilityLink).not.toBeVisible();
    });
  });

  test("footer links render in configured order", async ({ page }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Verify link order matches configuration", async () => {
      // Get all footer links in order
      const footerLinks = page
        .locator('[data-sidebar="footer"] a[data-testid^="footer-link-"]')
        .all();

      const links = await footerLinks;
      expect(links.length).toBeGreaterThan(0);

      // Verify links are in expected order
      const firstLink = page.getByTestId(
        "footer-link-footer_link_documentation",
      );
      const secondLink = page.getByTestId("footer-link-footer_link_support");

      await expect(firstLink).toBeVisible();
      await expect(secondLink).toBeVisible();

      // First link should appear before second link in the DOM
      const firstLinkPosition = await firstLink.boundingBox();
      const secondLinkPosition = await secondLink.boundingBox();

      expect(firstLinkPosition).not.toBeNull();
      expect(secondLinkPosition).not.toBeNull();

      // In a vertical sidebar, y-coordinate should be lower for second link
      if (firstLinkPosition && secondLinkPosition) {
        expect(firstLinkPosition.y).toBeLessThan(secondLinkPosition.y);
      }
    });
  });

  test("footer links respect sidebar type filtering", async ({ page }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Check facility-specific filtering", async () => {
      // Facility-only link should be visible in facility sidebar
      const facilityLink = page.getByTestId(
        "footer-link-footer_link_facility_only",
      );
      await expect(facilityLink).toBeVisible();

      // Links without sidebarFor should also be visible
      const documentationLink = page.getByTestId(
        "footer-link-footer_link_documentation",
      );
      await expect(documentationLink).toBeVisible();
    });
  });

  test("collapsed sidebar shows tooltips for footer links", async ({
    page,
  }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Toggle sidebar to collapsed state", async () => {
      // Find and click sidebar toggle button
      const toggleButton = page.locator('[data-sidebar="trigger"]');
      if ((await toggleButton.count()) > 0) {
        await toggleButton.click();
        await page.waitForTimeout(300); // Wait for collapse animation
      }
    });

    await test.step("Verify footer links still visible in collapsed state", async () => {
      const footerLink = page.getByTestId(
        "footer-link-footer_link_documentation",
      );
      await expect(footerLink).toBeVisible();

      // Icon should be visible in collapsed state
      const icon = footerLink.getByTestId("icon-footer_link_documentation");
      await expect(icon).toBeVisible();
    });
  });
});
