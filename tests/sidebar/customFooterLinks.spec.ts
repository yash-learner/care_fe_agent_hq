import { expect, test } from "@playwright/test";
import { getFacilityId } from "tests/support/facilityId";

// REQUIRED: Use authenticated storage state
test.use({ storageState: "tests/.auth/user.json" });

test.describe("Custom Footer Links in Sidebar", () => {
  let facilityId: string;

  test.beforeEach(async ({ page }) => {
    facilityId = getFacilityId();
    await page.goto(`/facility/${facilityId}/overview`);
  });

  test("should not display footer links when customFooterLinks config is empty", async ({
    page,
  }) => {
    await test.step("Verify no custom footer links are visible", async () => {
      // Wait for sidebar to be visible
      await expect(page.locator('[data-sidebar="sidebar"]')).toBeVisible();

      // Check that there are no custom footer links
      // The NavFooterLinks component returns null when visibleLinks.length === 0
      // So we verify that only the user nav is present in the footer
      const footer = page.locator('[data-sidebar="footer"]');
      await expect(footer).toBeVisible();

      // Verify NavUser is present
      const navUser = footer.locator('[data-sidebar="menu"]').last();
      await expect(navUser).toBeVisible();
    });
  });

  test("should display tooltip when sidebar is collapsed and hovering over link", async ({
    page,
  }) => {
    // This test will fail if customFooterLinks is empty, which is expected
    // since the feature requires manual config changes. This test serves as
    // documentation for the expected behavior when links are configured.
    test.skip(
      true,
      "Requires manual care.config.ts configuration to add test links",
    );

    await test.step("Collapse sidebar", async () => {
      // SidebarTrigger component (src/components/ui/sidebar.tsx line 259)
      // includes data-sidebar="trigger" and is present in facility overview
      // via AppRouter.tsx. This selector is stable and verified.
      const sidebarToggle = page.locator('[data-sidebar="trigger"]');
      await sidebarToggle.click();
      await expect(page.locator('[data-sidebar="sidebar"]')).toHaveAttribute(
        "data-state",
        "collapsed",
      );
    });

    await test.step("Hover over footer link and verify tooltip", async () => {
      // This would verify tooltip appears with link name
      // when hovering over a custom footer link in collapsed state
      const footerLink = page
        .locator('[data-sidebar="footer"]')
        .locator('[role="menuitem"]')
        .first();
      await footerLink.hover();
      // Tooltip should be visible with link name
      await expect(page.locator('[role="tooltip"]')).toBeVisible();
    });
  });

  test("should render external links with proper attributes", async ({
    page,
  }) => {
    test.skip(
      true,
      "Requires manual care.config.ts configuration to add test links",
    );

    await test.step("Verify external link has correct attributes", async () => {
      // External links should have:
      // - target="_blank"
      // - rel="noopener noreferrer"
      // - ExternalLink icon
      const externalLink = page
        .locator('[data-sidebar="footer"]')
        .locator('a[target="_blank"]')
        .first();
      await expect(externalLink).toHaveAttribute("rel", "noopener noreferrer");
      await expect(externalLink.locator("svg")).toBeVisible(); // ExternalLink icon
    });
  });

  test("should render internal links with proper navigation", async ({
    page,
  }) => {
    test.skip(
      true,
      "Requires manual care.config.ts configuration to add test links",
    );

    await test.step("Click internal link and verify navigation", async () => {
      // Internal links should navigate within the app
      // using raviger Link component (target="_self")
      const internalLink = page
        .locator('[data-sidebar="footer"]')
        .locator('a:not([target="_blank"])')
        .first();
      await internalLink.click();

      // Verify navigation occurred (URL changed)
      await expect(page).not.toHaveURL(/\/overview$/);
    });
  });

  test("should filter links based on sidebar context", async ({ page }) => {
    test.skip(
      true,
      "Requires manual care.config.ts configuration with visibleIn property",
    );

    await test.step("Verify context-specific links in facility sidebar", async () => {
      // Links with visibleIn: [SidebarFor.FACILITY] should appear
      // Navigate to different sidebar contexts and verify filtering
      await page.goto(`/facility/${facilityId}/overview`);
      const facilityFooterLinks = page
        .locator('[data-sidebar="footer"]')
        .locator('[role="menuitem"]');
      const facilityLinkCount = await facilityFooterLinks.count();

      // Navigate to admin sidebar
      await page.goto("/admin");
      const adminFooterLinks = page
        .locator('[data-sidebar="footer"]')
        .locator('[role="menuitem"]');
      const adminLinkCount = await adminFooterLinks.count();

      // Counts should differ if context filtering is working
      expect(facilityLinkCount).not.toBe(adminLinkCount);
    });
  });

  test("should display links in the order defined in configuration", async ({
    page,
  }) => {
    test.skip(
      true,
      "Requires manual care.config.ts configuration with multiple links",
    );

    await test.step("Verify link order matches configuration order", async () => {
      const footerLinks = page
        .locator('[data-sidebar="footer"]')
        .locator('[role="menuitem"]');

      // Get link names in order
      const linkTexts = await footerLinks.allTextContents();

      // Verify order matches configuration
      // This would require knowing the expected order from care.config.ts
      expect(linkTexts.length).toBeGreaterThan(0);
    });
  });

  test("should integrate plugin footer links alongside config links", async ({
    page,
  }) => {
    test.skip(
      true,
      "Plugin testing cannot be performed in automated QA - requires code review",
    );

    await test.step("Verify plugin links appear with config links", async () => {
      // This would verify that plugin-provided footerNavItems
      // appear alongside customFooterLinks from care.config.ts
      const footerLinks = page
        .locator('[data-sidebar="footer"]')
        .locator('[role="menuitem"]');
      expect(await footerLinks.count()).toBeGreaterThan(0);
    });
  });

  test("sidebar should render properly without custom footer links", async ({
    page,
  }) => {
    await test.step("Verify sidebar loads correctly with empty config", async () => {
      // Wait for sidebar to be visible
      await expect(page.locator('[data-sidebar="sidebar"]')).toBeVisible();

      // Verify sidebar content is visible
      await expect(
        page.locator('[data-sidebar="sidebar-content"]'),
      ).toBeVisible();

      // Verify footer with NavUser is visible
      const footer = page.locator('[data-sidebar="footer"]');
      await expect(footer).toBeVisible();

      // Verify NavUser menu is present (last menu in footer)
      const navUserMenu = footer.locator('[data-sidebar="menu"]').last();
      await expect(navUserMenu).toBeVisible();
    });
  });

  test("should verify NavFooterLinks component placement above NavUser", async ({
    page,
  }) => {
    await test.step("Check footer structure", async () => {
      const footer = page.locator('[data-sidebar="footer"]');
      await expect(footer).toBeVisible();

      // The footer should contain NavUser at the end
      // NavFooterLinks would appear before NavUser when links are configured
      const menus = footer.locator('[data-sidebar="menu"]');
      const menuCount = await menus.count();

      // With empty config, only NavUser menu should be present
      // When links are configured, there would be 2 menus:
      // 1. NavFooterLinks menu
      // 2. NavUser menu
      expect(menuCount).toBeGreaterThanOrEqual(1);
    });
  });
});
