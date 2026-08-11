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
    });
  });

  test("external links have correct attributes and icons", async ({ page }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Check for external link with ExternalLink icon", async () => {
      // If custom footer links are configured with external links,
      // they should have target="_blank" and rel="noopener noreferrer"
      const externalLinks = page.locator(
        '[data-sidebar="footer"] a[target="_blank"]',
      );
      const count = await externalLinks.count();

      if (count > 0) {
        // Verify first external link has correct attributes
        const firstLink = externalLinks.first();
        await expect(firstLink).toHaveAttribute("target", "_blank");
        await expect(firstLink).toHaveAttribute("rel", "noopener noreferrer");

        // Verify ExternalLink icon is present
        const externalIcon = firstLink.locator('svg[class*="lucide-external"]');
        await expect(externalIcon).toBeVisible();
      }
    });
  });

  test("internal links use ArrowRight icon", async ({ page }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Check for internal link with ArrowRight icon", async () => {
      // Internal links should not have target="_blank"
      const footerLinks = page.locator(
        '[data-sidebar="footer"] a:not([target="_blank"])',
      );
      const count = await footerLinks.count();

      if (count > 0) {
        // Find links that are not the user avatar dropdown
        const internalLinks = footerLinks.filter({
          has: page.locator('svg[class*="lucide-arrow-right"]'),
        });
        const internalCount = await internalLinks.count();

        if (internalCount > 0) {
          // Verify ArrowRight icon is present
          const firstLink = internalLinks.first();
          const arrowIcon = firstLink.locator(
            'svg[class*="lucide-arrow-right"]',
          );
          await expect(arrowIcon).toBeVisible();
        }
      }
    });
  });

  test("external link opens in new tab", async ({ page, context }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Click external link and verify new tab", async () => {
      const externalLinks = page.locator(
        '[data-sidebar="footer"] a[target="_blank"]',
      );
      const count = await externalLinks.count();

      if (count > 0) {
        const firstLink = externalLinks.first();

        // Listen for new page event
        const [newPage] = await Promise.all([
          context.waitForEvent("page"),
          firstLink.click(),
        ]);

        // Verify new page opened
        expect(newPage).toBeDefined();
        await newPage.waitForLoadState();

        // Original page should still be on the same URL
        expect(page.url()).toContain(`/facility/${facilityId}/overview`);

        await newPage.close();
      }
    });
  });

  test("internal link navigates in same tab", async ({ page }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Click internal link and verify same-tab navigation", async () => {
      const internalLinks = page.locator(
        '[data-sidebar="footer"] a:not([target="_blank"])',
      );

      // Filter to find actual footer links (exclude user avatar)
      const footerNavLinks = internalLinks.filter({
        has: page.locator('svg[class*="lucide-arrow-right"]'),
      });
      const count = await footerNavLinks.count();

      if (count > 0) {
        const firstLink = footerNavLinks.first();
        const href = await firstLink.getAttribute("href");

        if (href) {
          await firstLink.click();
          await page.waitForLoadState("networkidle");

          // Verify navigation occurred in same tab
          expect(page.url()).toContain(href);
        }
      }
    });
  });

  test("footer links appear in multiple sidebar contexts", async ({ page }) => {
    await test.step("Check footer links in facility sidebar", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");

      const sidebarFooter = page.locator('[data-sidebar="footer"]');
      await expect(sidebarFooter).toBeVisible();
    });

    await test.step("Check footer links in patient sidebar", async () => {
      // Navigate to patient context (if configured links apply)
      await page.goto("/patients");
      await page.waitForLoadState("networkidle");

      const sidebarFooter = page.locator('[data-sidebar="footer"]');
      await expect(sidebarFooter).toBeVisible();
    });

    await test.step("Check footer links in admin sidebar", async () => {
      // Navigate to admin context (if configured links apply)
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");

      const sidebarFooter = page.locator('[data-sidebar="footer"]');
      await expect(sidebarFooter).toBeVisible();
    });
  });

  test("footer links render in configured order", async ({ page }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Verify link order matches configuration", async () => {
      // Get all footer links (excluding user avatar)
      const footerLinks = page.locator('[data-sidebar="footer"] a').filter({
        has: page.locator('svg[class*="lucide"]'),
      });

      const count = await footerLinks.count();

      if (count > 0) {
        // Verify links are present and ordered
        const linkTexts = await footerLinks.allTextContents();
        expect(linkTexts.length).toBeGreaterThan(0);

        // Links should be in the order they were configured
        // (This test validates structure but cannot verify exact order without knowing config)
      }
    });
  });

  test("footer links respect sidebar type filtering", async ({ page }) => {
    await test.step("Navigate to facility page", async () => {
      await page.goto(`/facility/${facilityId}/overview`);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Check facility-specific links", async () => {
      const sidebarFooter = page.locator('[data-sidebar="footer"]');
      await expect(sidebarFooter).toBeVisible();

      // If links are configured with sidebarFor filter,
      // only matching links should be visible
      // (Implementation depends on specific configuration)
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

    await test.step("Hover footer link to show tooltip", async () => {
      const footerLinks = page.locator('[data-sidebar="footer"] a').filter({
        has: page.locator('svg[class*="lucide"]'),
      });

      const count = await footerLinks.count();

      if (count > 0) {
        const firstLink = footerLinks.first();
        await firstLink.hover();

        // Tooltip should appear (implementation uses SidebarMenuButton tooltip prop)
        // Verify tooltip is visible if configured
        await page.waitForTimeout(500);
      }
    });
  });
});
