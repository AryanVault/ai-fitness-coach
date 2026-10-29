import { expect, test } from "@playwright/test";

test("movement study responds to pointer, keyboard and playback without hydration errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Move with intent." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /bicep curl/i }).click();
  await expect(
    page.getByRole("button", { name: /bicep curl/i }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Elbow angle", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Bicep curl movement study/ }),
  ).toBeVisible();
  const slider = page.getByRole("slider", { name: "Explore the movement" });
  await slider.focus();
  await slider.press("Home");
  await expect(slider).toHaveValue("0");
  await slider.press("End");
  await expect(slider).toHaveValue("100");
  await page.getByRole("button", { name: /lunge/i }).click();
  await expect(page.getByText("Knee angle", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => slider.inputValue()).not.toBe("100");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Your data", exact: true }).click();
  await expect(page).toHaveURL(/#your-data$/);
  expect(errors).toEqual([]);
});

test("mobile first screen fits and its controls remain reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Move with intent." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /bicep curl/i }).click();
  await page.getByRole("button", { name: /squat/i }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const hero = await page.locator(".studio-first-screen").boundingBox();
  expect(hero!.height).toBeGreaterThanOrEqual(812);
  await page.getByRole("link", { name: "Find your starting point" }).click();
  await expect(page).toHaveURL(/\/(?:login|sign-in)\?next=%2Fonboarding/);
});

test("content stays visible with JavaScript disabled", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Move with intent." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Find your starting point" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your camera. Your space." }),
  ).toBeVisible();
  await context.close();
});

test("reduced motion retains a fully usable static movement study", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Move with intent." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /bicep curl/i }).click();
  await expect(page.getByText("Elbow angle", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("slider")).toBeVisible();
});
