import { expect, test, type Page } from "@playwright/test";

const summary = {
  streak: 2,
  totalWorkouts: 4,
  totalMinutes: 32,
  totalCalories: 150,
  averageScore: 81,
  adherence: 50,
  recentSessions: [],
  weightTrend: [],
  activePlan: null,
  activeNutritionPlan: null,
};

test("expired session returns to sign-in with the intended page preserved", async ({ page, baseURL }) => {
  test.skip(Boolean(process.env.PLAYWRIGHT_USE_BUILD), "Development cookie gate");
  await page.context().addCookies([{ name: "better-auth.session_token", value: "expired-local-test", url: baseURL ?? "http://127.0.0.1:3118" }]);
  await page.route("**/api/session", route => route.fulfill({status:401,json:{session:null,user:null}}));
  await page.goto("/recovery");
  await expect(page).toHaveURL(/\/login\?next=%2Frecovery$/);
  await expect(page.getByRole("button",{name:"Sign in",exact:true})).toBeVisible();
});
const recoveryCheckIn = {
  sleepHours: 8,
  sleepQuality: 4,
  soreness: 2,
  stress: 2,
  energy: 4,
  hydration: 3,
  mood: "steady",
  notes: "Saved before the network failure",
  loggedAt: "2026-10-27T08:00:00.000Z",
};

// Intercept only HTTP boundaries: the actual pages, controls and proxy still run.
// A local cookie passes development middleware; no server session or DB is created.
async function localSession(page: Page, baseURL: string | undefined) {
  await page.context().addCookies([
    {
      name: "better-auth.session_token",
      value: "reliability-browser-test",
      url: baseURL ?? "http://127.0.0.1:3100",
    },
  ]);
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        session: { userId: "reliability-test", expiresAt: null },
        user: {
          id: "reliability-test",
          name: "Test Athlete",
          email: "test@example.test",
        },
      },
    }),
  );
  await page.route("**/api/profile", (route) =>
    route.fulfill({
      json: {
        profile: {
          userId: "reliability-test",
          name: "Test Athlete",
          goals: [],
          dietaryPrefs: [],
          injuries: [],
          painPoints: [],
          equipmentAccess: [],
          readinessAssumptions: [],
          coachingConstraints: [],
          experience: "beginner",
          onboardingCompleted: true,
        },
      },
    }),
  );
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: { settings: { theme: "light" } } }),
  );
}

test("recovery redirects signed-out visitors before rendering private controls", async ({
  page,
}) => {
  await page.goto("/recovery");
  await expect(page).toHaveURL(/\/(login|sign-in)\?next=%2Frecovery/);
  await expect(
    page.getByRole("button", { name: "Save recovery check-in" }),
  ).toHaveCount(0);
});

test.describe("recoverable client requests", () => {
  test.skip(
    Boolean(process.env.PLAYWRIGHT_USE_BUILD),
    "Uses development-only local middleware session",
  );
  const browserErrors = new WeakMap<Page, string[]>();
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    browserErrors.set(page, errors);
    page.on("pageerror", (error) => errors.push(error.message));
  });
  test.afterEach(async ({ page }) => {
    expect(
      browserErrors.get(page),
      "Network failures must be handled by the page",
    ).toEqual([]);
  });

  for (const failure of ["http", "network"] as const) {
    test(`recovery load settles after ${failure} failure and retries saved data`, async ({
      page,
      baseURL,
    }) => {
      await localSession(page, baseURL);
      let fail = true;
      await page.route("**/api/recovery/checkin", (route) =>
        fail
          ? failure === "http"
            ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
            : route.abort("failed")
          : route.fulfill({ json: { recoveryCheckIn } }),
      );
      await page.goto("/recovery");
      await expect(page.locator("main").getByRole("alert")).toContainText(
        "Could not load your recovery check-in",
      );
      await expect(page.getByText("Loading latest check-in")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Save recovery check-in" }),
      ).toBeDisabled();
      fail = false;
      await page
        .getByRole("button", { name: "Retry loading check-in" })
        .click();
      await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
        recoveryCheckIn.notes,
      );
      await expect(
        page.getByRole("button", { name: "Save recovery check-in" }),
      ).toBeEnabled();
      await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    });

    test(`recovery save settles after ${failure} failure and preserves edits for retry`, async ({
      page,
      baseURL,
    }) => {
      await localSession(page, baseURL);
      let fail = true;
      await page.route("**/api/recovery/checkin", async (route) => {
        if (route.request().method() === "GET")
          return route.fulfill({ json: { recoveryCheckIn } });
        if (fail)
          return failure === "http"
            ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
            : route.abort("failed");
        return route.fulfill({
          json: {
            recoveryCheckIn: {
              ...route.request().postDataJSON(),
              loggedAt: "2026-10-28T09:00:00.000Z",
            },
          },
        });
      });
      await page.goto("/recovery");
      await expect(
        page.getByRole("button", { name: "Save recovery check-in" }),
      ).toBeEnabled();
      await page
        .getByLabel("Notes", { exact: true })
        .fill("Keep this unsaved note");
      await page
        .getByRole("button", { name: "Save recovery check-in" })
        .click();
      await expect(page.locator("main").getByRole("alert")).toContainText(
        "Could not save your check-in",
      );
      await expect(
        page.getByRole("button", { name: "Save recovery check-in" }),
      ).toBeEnabled();
      await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
        "Keep this unsaved note",
      );
      fail = false;
      await page
        .getByRole("button", { name: "Save recovery check-in" })
        .click();
      await expect(page.getByRole("status")).toContainText("Check-in saved");
      await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    });

    test(`dashboard distinguishes ${failure} failure from empty history and retries`, async ({
      page,
      baseURL,
    }) => {
      await localSession(page, baseURL);
      let fail = true;
      await page.route("**/api/dashboard", (route) =>
        fail
          ? failure === "http"
            ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
            : route.abort("failed")
          : route.fulfill({ json: summary }),
      );
      await page.route("**/api/coach/agent", (route) =>
        route.fulfill({ status: 503, json: { error: "Unavailable" } }),
      );
      await page.route("**/api/dance/course", (route) =>
        route.fulfill({ json: { course: null } }),
      );
      await page.goto("/dashboard");
      await expect(page.locator("main").getByRole("alert")).toContainText(
        "Could not load your dashboard",
      );
      await expect(page.getByText("No completed sessions yet")).toHaveCount(0);
      await expect(
        page.getByText("Total Workouts", { exact: true }),
      ).toHaveCount(0);
      fail = false;
      await page.getByRole("button", { name: "Retry dashboard" }).click();
      await expect(
        page.getByText("Total Workouts", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Could not load your dashboard")).toHaveCount(
        0,
      );
    });
  }

  test("optional coach failure cannot prevent dance progress or dashboard summary", async ({
    page,
    baseURL,
  }) => {
    await localSession(page, baseURL);
    await page.route("**/api/dashboard", (route) =>
      route.fulfill({ json: summary }),
    );
    await page.route("**/api/coach/agent", (route) => route.abort("failed"));
    let failCourse = true;
    await page.route("**/api/dance/course", (route) =>
      failCourse
        ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
        : route.fulfill({
            json: {
              course: {
                completionPercent: 25,
                completedLessons: 1,
                totalLessons: 4,
                nextLesson: {
                  title: "Test groove lesson",
                  bestScore: 73,
                  status: "in_progress",
                },
              },
            },
          }),
    );
    await page.goto("/dashboard");
    await expect(
      page.getByText("Total Workouts", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Coach recommendations are unavailable.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Dance course progress is unavailable.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Coach memory is not ready yet")).toHaveCount(
      0,
    );
    failCourse = false;
    await page.getByRole("button", { name: "Retry dance progress" }).click();
    await expect(
      page.getByRole("heading", { name: "Test groove lesson" }),
    ).toBeVisible();
    await expect(
      page.getByText("Dance course progress is unavailable.", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Coach recommendations are unavailable.", { exact: true }),
    ).toBeVisible();
  });
});
