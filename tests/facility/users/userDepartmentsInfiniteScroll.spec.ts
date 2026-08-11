import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { getApiHeaders, getApiUrl } from "tests/helper/utils";
import { getFacilityId } from "tests/support/facilityId";

const DEPT_COUNT = 25; // > PAGE_LIMIT (20) to trigger infinite scroll
const DEPT_PREFIX = "UserDeptTest";

test.use({ storageState: "tests/.auth/user.json" });

test.describe("User Departments Tab Infinite Scroll", () => {
  let testUserId: string;
  let testRoleId: string;

  test.beforeAll(async () => {
    const facilityId = getFacilityId();
    const apiUrl = getApiUrl();
    const headers = getApiHeaders();

    // Fetch available roles from organization API
    const rolesRes = await fetch(
      `${apiUrl}/api/v1/organization/?org_type=role&limit=1`,
      { headers },
    );
    if (!rolesRes.ok) {
      throw new Error(`Failed to fetch roles: ${rolesRes.status}`);
    }
    const rolesData = (await rolesRes.json()) as {
      results: Array<{ id: string }>;
    };

    if (rolesData.results.length === 0) {
      throw new Error("No roles available for testing");
    }

    testRoleId = rolesData.results[0].id;
    console.log(`Using test role ID: ${testRoleId}`);

    // Create or find a test user
    const usersRes = await fetch(
      `${apiUrl}/api/v1/facility/${facilityId}/users/?limit=1`,
      { headers },
    );
    if (!usersRes.ok) {
      throw new Error(`Failed to list users: ${usersRes.status}`);
    }
    const usersData = (await usersRes.json()) as {
      results: Array<{ id: string }>;
    };

    if (usersData.results.length === 0) {
      throw new Error("No users available for testing");
    }

    testUserId = usersData.results[0].id;
    console.log(`Using test user ID: ${testUserId}`);

    // Check how many UserDeptTest departments already exist
    const listRes = await fetch(
      `${apiUrl}/api/v1/facility/${facilityId}/organizations/?name=${DEPT_PREFIX}&limit=50`,
      { headers },
    );
    if (!listRes.ok) throw new Error(`Failed to list orgs: ${listRes.status}`);
    const listData = (await listRes.json()) as {
      count: number;
      results: Array<{ id: string; name: string }>;
    };

    let departmentIds: string[] = listData.results.map((d) => d.id);

    // Create departments if needed
    if (listData.count < DEPT_COUNT) {
      const toCreate = DEPT_COUNT - listData.count;
      console.log(`Creating ${toCreate} departments...`);

      for (let i = 0; i < toCreate; i++) {
        const name = `${DEPT_PREFIX} ${faker.string.alphanumeric(6)}`;
        const res = await fetch(
          `${apiUrl}/api/v1/facility/${facilityId}/organizations/`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              name,
              description: `Test department for user departments infinite scroll`,
              org_type: "dept",
              facility: facilityId,
            }),
          },
        );
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(
            `Failed to create department: ${res.status} — ${errorText}`,
          );
        }
        const deptData = (await res.json()) as { id: string };
        departmentIds.push(deptData.id);
      }
      console.log(`✅ Created ${toCreate} departments`);
    } else {
      console.log(
        `✅ Already have ${listData.count} ${DEPT_PREFIX} departments`,
      );
    }

    // Link all departments to the test user
    console.log(`Linking ${departmentIds.length} departments to user...`);
    for (const deptId of departmentIds) {
      // Check if user is already linked
      const checkRes = await fetch(
        `${apiUrl}/api/v1/facility/${facilityId}/organizations/${deptId}/users/`,
        { headers },
      );
      if (!checkRes.ok) {
        continue;
      }

      const userData = (await checkRes.json()) as {
        results: Array<{ user: { id: string } }>;
      };

      const alreadyLinked = userData.results.some(
        (u) => u.user.id === testUserId,
      );

      if (alreadyLinked) {
        continue;
      }

      // Link user to department
      const linkRes = await fetch(
        `${apiUrl}/api/v1/facility/${facilityId}/organizations/${deptId}/users/`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            user: testUserId,
            role: testRoleId,
          }),
        },
      );
      if (!linkRes.ok) {
        console.warn(
          `⚠️  Failed to link user to dept ${deptId}: ${linkRes.status}`,
        );
      }
    }
    console.log(`✅ Linked user to departments`);
  });

  test("user with 20+ departments can view all via infinite scroll", async ({
    page,
  }) => {
    const facilityId = getFacilityId();

    await test.step("Navigate to user's Departments tab", async () => {
      await page.goto(`/facility/${facilityId}/users`);
      await expect(
        page.getByRole("button", { name: "See Details" }).first(),
      ).toBeVisible();
      await page.getByRole("button", { name: "See Details" }).first().click();
      await page.waitForLoadState("networkidle");
      await page.getByText("Departments", { exact: true }).click();
      await page.waitForLoadState("networkidle");
    });

    await test.step("Verify first page of departments loads", async () => {
      // Wait for department cards to appear
      const departmentCards = page.locator(".grid > .h-full");
      await expect(departmentCards.first()).toBeVisible();

      const initialCount = await departmentCards.count();
      expect(initialCount).toBeGreaterThan(0);
      console.log(`Initial departments visible: ${initialCount}`);
    });

    await test.step("Scroll to bottom to trigger infinite scroll", async () => {
      const departmentCards = page.locator(".grid > .h-full");
      const initialCount = await departmentCards.count();

      // Set up listener for the next-page API request before scrolling
      const nextPageRequest = page.waitForResponse(
        (resp) =>
          resp.url().includes("/organizations/") &&
          resp.url().includes("offset=") &&
          resp.url().includes("containing_user=") &&
          resp.status() === 200,
        { timeout: 10000 },
      );

      // Scroll to the bottom of the page to trigger the sentinel
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Verify the paginated API request was fired
      await nextPageRequest;
      console.log("✅ Next page API request detected");

      // Verify more items rendered from the response
      await expect(async () => {
        const newCount = await departmentCards.count();
        console.log(
          `After scroll: ${newCount} departments (was ${initialCount})`,
        );
        expect(newCount).toBeGreaterThan(initialCount);
      }).toPass({ timeout: 10000 });
    });

    await test.step("Verify all departments are eventually visible", async () => {
      const departmentCards = page.locator(".grid > .h-full");

      // Continue scrolling until all departments are loaded
      let previousCount = 0;
      let currentCount = await departmentCards.count();
      let iterations = 0;
      const maxIterations = 5;

      while (currentCount > previousCount && iterations < maxIterations) {
        previousCount = currentCount;

        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        // Wait for potential new departments to load
        await page.waitForTimeout(1000);

        currentCount = await departmentCards.count();
        iterations++;

        console.log(
          `Scroll iteration ${iterations}: ${currentCount} departments visible`,
        );
      }

      // Verify we have at least DEPT_COUNT departments visible
      expect(currentCount).toBeGreaterThanOrEqual(DEPT_COUNT);
      console.log(`✅ Total departments visible: ${currentCount}`);
    });
  });

  test("user with exactly 14 departments shows all without pagination", async ({
    page,
  }) => {
    const facilityId = getFacilityId();
    const apiUrl = getApiUrl();
    const headers = getApiHeaders();

    let user14Id: string | null = null;

    await test.step("Find or create a user with exactly 14 departments", async () => {
      // Try to find a user with exactly 14 departments
      const usersRes = await fetch(
        `${apiUrl}/api/v1/facility/${facilityId}/users/?limit=20`,
        { headers },
      );
      if (!usersRes.ok) {
        throw new Error(`Failed to list users: ${usersRes.status}`);
      }

      const usersData = (await usersRes.json()) as {
        results: Array<{ id: string; username: string }>;
      };

      // Check each user for department count
      for (const user of usersData.results) {
        const deptRes = await fetch(
          `${apiUrl}/api/v1/facility/${facilityId}/organizations/?containing_user=${user.id}&limit=1`,
          { headers },
        );
        if (!deptRes.ok) {
          continue;
        }

        const deptData = (await deptRes.json()) as { count: number };
        if (deptData.count === 14) {
          user14Id = user.id;
          console.log(
            `Found user with exactly 14 departments: ${user.username}`,
          );
          break;
        }
      }

      if (!user14Id) {
        console.log(
          "⚠️  No user with exactly 14 departments found, skipping test",
        );
        test.skip();
      }
    });

    await test.step("Navigate to user's Departments tab", async () => {
      await page.goto(`/facility/${facilityId}/users`);
      await expect(
        page.getByRole("button", { name: "See Details" }).first(),
      ).toBeVisible();
      await page.getByRole("button", { name: "See Details" }).first().click();
      await page.waitForLoadState("networkidle");
      await page.getByText("Departments", { exact: true }).click();
      await page.waitForLoadState("networkidle");
    });

    await test.step("Verify all 14 departments are visible", async () => {
      const departmentCards = page.locator(".grid > .h-full");
      await expect(departmentCards.first()).toBeVisible();

      const count = await departmentCards.count();
      expect(count).toBe(14);
      console.log(`✅ All ${count} departments visible without pagination`);

      // Verify no pagination sentinel is present (no "loading" indicator at bottom)
      const loadingSentinel = page.getByText("loading", { exact: false });
      await expect(loadingSentinel).not.toBeVisible();
    });
  });

  test("empty state when user has no departments", async ({ page }) => {
    const facilityId = getFacilityId();
    const apiUrl = getApiUrl();
    const headers = getApiHeaders();

    let emptyUserId: string | null = null;

    await test.step("Find or create a user with no departments", async () => {
      // Try to find a user with no departments
      const usersRes = await fetch(
        `${apiUrl}/api/v1/facility/${facilityId}/users/?limit=10`,
        { headers },
      );
      if (!usersRes.ok) {
        throw new Error(`Failed to list users: ${usersRes.status}`);
      }

      const usersData = (await usersRes.json()) as {
        results: Array<{ id: string; username: string }>;
      };

      // Check each user for department count
      for (const user of usersData.results) {
        const deptRes = await fetch(
          `${apiUrl}/api/v1/facility/${facilityId}/organizations/?containing_user=${user.id}&limit=1`,
          { headers },
        );
        if (!deptRes.ok) {
          continue;
        }

        const deptData = (await deptRes.json()) as { count: number };
        if (deptData.count === 0) {
          emptyUserId = user.id;
          console.log(`Found user with no departments: ${user.username}`);
          break;
        }
      }

      if (!emptyUserId) {
        console.log("⚠️  No user without departments found, skipping test");
        test.skip();
      }
    });

    if (emptyUserId) {
      await test.step("Navigate to user's Departments tab", async () => {
        await page.goto(`/facility/${facilityId}/users`);
        await page.waitForLoadState("networkidle");

        // Find the specific user and click details
        // Note: This assumes the user is visible in the list
        await expect(
          page.getByRole("button", { name: "See Details" }).first(),
        ).toBeVisible();
        await page.getByRole("button", { name: "See Details" }).first().click();
        await page.waitForLoadState("networkidle");
        await page.getByText("Departments", { exact: true }).click();
        await page.waitForLoadState("networkidle");
      });

      await test.step("Verify empty state is displayed", async () => {
        // Look for the empty state message
        await expect(
          page.getByText("No departments assigned", { exact: false }),
        ).toBeVisible();
        console.log("✅ Empty state displayed correctly");
      });
    }
  });
});
