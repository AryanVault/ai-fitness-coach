import { expect, test, type Page } from "@playwright/test";

const catalog = [
  {
    id: "catalog-squat",
    name: "Squats",
    category: "strength",
    difficulty: "beginner",
    description: "Controlled lower-body movement.",
    muscleGroup: "legs",
    equipment: "bodyweight",
  },
  {
    id: "catalog-jacks",
    name: "Jumping Jacks",
    category: "cardio",
    difficulty: "beginner",
    description: "A rhythmic full-body movement.",
  },
  {
    id: "demo-bicep-curl",
    name: "Bicep Curl",
    category: "strength",
    difficulty: "beginner",
    instructions: "Keep elbows close and lower with control.",
  },
  {
    id: "unsupported",
    name: "Burpees",
    category: "hiit",
    difficulty: "intermediate",
    description: "Not supported by the camera analyzer.",
  },
];

async function localSession(page: Page, baseURL: string | undefined) {
  await page.context().addCookies([
    {
      name: "better-auth.session_token",
      value: "library-browser-test",
      url: baseURL ?? "http://127.0.0.1:3118",
    },
  ]);
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        session: { userId: "library-test", expiresAt: null },
        user: {
          id: "library-test",
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
          userId: "library-test",
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

test.describe("movement library", () => {
  test.skip(
    Boolean(process.env.PLAYWRIGHT_USE_BUILD),
    "Uses development-only middleware session",
  );

  test("search and category filter supported exercises and the real starter course", async ({
    page,
    baseURL,
  }) => {
    await localSession(page, baseURL);
    await page.route("**/api/exercises", (route) =>
      route.fulfill({ json: { exercises: catalog } }),
    );
    await page.goto("/workouts");
    await expect(
      page.getByRole("heading", { name: "Squats", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Burpees", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("option", { name: "Hiit", exact: true }),
    ).toHaveCount(0);
    const category = page.getByLabel("Movement category", { exact: true });
    await category.selectOption("cardio");
    await expect(
      page.getByRole("heading", { name: "Jumping Jacks", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Squats", exact: true }),
    ).toHaveCount(0);
    await page.getByLabel("Search movements", { exact: true }).fill("legs");
    await expect(
      page.getByText("No movements match these filters."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(category).toHaveValue("all");
    await expect(
      page.getByLabel("Search movements", { exact: true }),
    ).toHaveValue("");
    await category.selectOption("dance");
    await expect(
      page.getByRole("heading", {
        name: "Hip-Hop Starter Groove",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByLabel("Search movements", { exact: true })
      .fill("bollywood");
    await expect(
      page.getByRole("link", { name: "Open Hip-Hop Starter Groove" }),
    ).toHaveCount(0);
    await page.getByLabel("Search movements", { exact: true }).fill("hip-hop");
    await expect(
      page.getByRole("link", { name: "Open Hip-Hop Starter Groove" }),
    ).toHaveAttribute("href", "/coach/dance");
  });

  test("canonical session links resolve catalog IDs and omit unavailable metadata", async ({
    page,
    baseURL,
  }) => {
    await localSession(page, baseURL);
    await page.route("**/api/exercises", (route) =>
      route.fulfill({ json: { exercises: catalog } }),
    );
    await page.goto("/workouts");
    await expect(
      page.getByRole("link", { name: "Practice Squats", exact: true }),
    ).toHaveAttribute("href", "/coach/workout?exercise=squat");
    await expect(
      page.getByRole("link", { name: "Practice Jumping Jacks", exact: true }),
    ).toHaveAttribute("href", "/coach/workout?exercise=jumping_jack");
    await expect(
      page.getByRole("link", { name: "Practice Bicep Curl", exact: true }),
    ).toHaveAttribute("href", "/coach/workout?exercise=bicep_curl");
    await expect(
      page.getByText("Keep elbows close and lower with control."),
    ).toBeVisible();
    await expect(page.locator("main")).not.toContainText("undefined");
    await expect(page.locator("main")).not.toContainText(
      /cal\/min|Featured Workouts|Morning Energy Boost/,
    );
    await expect(page.getByRole("button", { name: "View All" })).toHaveCount(0);
  });

  for (const failure of ["http", "network"] as const) {
    test(`catalog ${failure} failure is retryable and never shown as an empty result`, async ({
      page,
      baseURL,
    }) => {
      await localSession(page, baseURL);
      const browserErrors: string[] = [];
      page.on("pageerror", (error) => browserErrors.push(error.message));
      let fail = true;
      await page.route("**/api/exercises", (route) =>
        fail
          ? failure === "http"
            ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
            : route.abort("failed")
          : route.fulfill({ json: { exercises: catalog } }),
      );
      await page.goto("/workouts");
      await expect(page.locator("main").getByRole("alert")).toContainText(
        "Could not load the movement catalog",
      );
      await expect(
        page.getByText("No movements match these filters."),
      ).toHaveCount(0);
      fail = false;
      await page.getByRole("button", { name: "Retry catalog" }).click();
      await expect(
        page.getByRole("heading", { name: "Bicep Curl", exact: true }),
      ).toBeVisible();
      await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
      expect(browserErrors).toEqual([]);
    });
  }
});
