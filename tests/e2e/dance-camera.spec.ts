import { expect, test } from "@playwright/test";

test.use({ launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] }, permissions: ["camera"], trace: "off" });

for (const width of [1440, 393]) {
  test(`dance audio and stationary timing remain honest at ${width}px`, async ({ page, baseURL }) => {
    test.skip(process.env.E2E_REAL_DATABASE !== "true" || !!process.env.PLAYWRIGHT_USE_BUILD, "Requires isolated database and development auth");
    const origin = new URL(baseURL!).origin;
    await page.setViewportSize({ width, height: 900 });
    const signup = await page.request.post("/api/auth/sign-up/email", { headers: { origin }, data: { email: `dance-camera-${crypto.randomUUID()}@example.test`, password: "Test-only-fitness-123!", name: "Dance Camera Test" } });
    expect(signup.ok()).toBe(true);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    try {
      // Synthetic pose isolates transport and scoring behavior, not pose accuracy.
      await page.addInitScript(() => {
        (window as any).__danceTest = { frames: 0 };
        const NativeWorker = window.Worker;
        window.Worker = class {
          onmessage: ((event: any) => void) | null = null;
          constructor(url: string | URL, options?: WorkerOptions) { if (!String(url).includes("/mediapipe/pose-worker.js")) return new NativeWorker(url, options) as any; }
          postMessage(message: any) {
            message.bitmap?.close();
            if (message.type === "init") { queueMicrotask(() => this.onmessage?.({ data: { id: message.id } })); return; }
            const landmarks = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: .99 }));
            for (const [i,x,y] of [[11,.4,.25],[12,.6,.25],[13,.32,.33],[14,.68,.33],[15,.25,.37],[16,.75,.37],[23,.43,.5],[24,.57,.5],[25,.43,.7],[26,.57,.7],[27,.43,.9],[28,.57,.9]]) landmarks[i] = { x,y,z:0,visibility:.99 };
            (window as any).__danceTest.frames++;
            queueMicrotask(() => this.onmessage?.({ data: { id: message.id, landmarks, worldLandmarks: [], brightness: 100, latencyMs: 2, poseCount: 1, delegate: "CPU" } }));
          }
          terminate() {}
        } as any;
      });
      let courseUnavailable = true;
      await page.route("**/api/dance/course", route => courseUnavailable && route.request().method() === "GET" ? route.fulfill({ status: 503, json: { error: "Temporarily unavailable" } }) : route.continue());
      await page.goto("/coach/dance", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("alert").filter({ hasText: "Dance course could not load." })).toBeVisible();
      courseUnavailable = false;
      await page.getByRole("button", { name: "Retry dance course", exact: true }).click();
      const phrase = page.getByRole("combobox", { name: "Study a phrase" });
      await phrase.selectOption("1"); await expect(phrase).toHaveValue("1");
      await expect(page.getByRole("button", { name: "Record practice attempt" })).toHaveCount(0);
      await page.getByRole("button", { name: "Practice with camera", exact: true }).click();
      await page.getByRole("button", { name: "Enable camera", exact: true }).click();
      await expect(page.getByRole("button", { name: "Start session", exact: true })).toBeEnabled();
      await page.getByRole("button", { name: "Start session", exact: true }).click();
      const transport = page.getByRole("group", { name: "Routine audio transport" });
      await expect(transport.getByRole("button", { name: "Stop routine audio", exact: true })).toBeVisible();
      const preview = page.getByTestId("camera-preview");
      await preview.getByRole("button", { name: "3D HUD", exact: true }).click();
      await expect(preview.getByRole("button", { name: "3D HUD", exact: true })).toHaveAttribute("aria-pressed", "true");
      await preview.getByRole("button", { name: "2D HUD", exact: true }).click();
      await preview.getByRole("button", { name: "3D HUD", exact: true }).click();
      await expect(preview.getByRole("button", { name: "3D HUD", exact: true })).toHaveAttribute("aria-pressed", "true");
      await preview.getByRole("button", { name: "2D HUD", exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__danceTest.frames)).toBeGreaterThan(30);
      await expect(page.getByTestId("dance-timing-score")).toHaveText("Unavailable");
      await transport.getByRole("button", { name: "Stop routine audio", exact: true }).click();
      await expect(transport.getByRole("button", { name: "Play routine audio", exact: true })).toBeVisible();
      await transport.getByRole("button", { name: "Play routine audio", exact: true }).click();
      await expect(transport.getByRole("button", { name: "Stop routine audio", exact: true })).toBeVisible();
      await page.screenshot({ path: `/tmp/fitcoach-dance-live-${width}.png`, fullPage: true });
      await preview.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/fitcoach-dance-preview-${width}.png` });
      const overflow = await page.evaluate(() => [...document.querySelectorAll("main *")].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(element => ({ tag: element.tagName, class: element.className, text: element.textContent?.slice(0,70), right: element.getBoundingClientRect().right })));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), JSON.stringify(overflow)).toBe(true);
      const saving = page.waitForResponse(response => response.url().endsWith("/api/workouts") && response.request().method() === "POST");
      await page.getByRole("button", { name: "Stop session", exact: true }).first().click();
      const saved = await saving; expect(saved.ok(), await saved.text()).toBe(true);
      const payload = saved.request().postDataJSON();
      expect(payload.modelEvidence.analysisVersion).toBe("movement-engine-v3");
      expect(payload.modelEvidence.scoreAvailability.tempo).toBe(false);
      expect(payload.danceSegments[0].timingEvents).toBe(0);
      await expect(transport.getByRole("button", { name: "Play routine audio", exact: true })).toBeDisabled();
      const course = await (await page.request.get("/api/dance/course")).json();
      expect(course.course.completedLessons).toBe(0);
      expect(errors).toEqual([]);
    } finally {
      const cleanup = page.request; await page.close();
      await cleanup.delete("/api/account", { headers: { origin }, data: { confirmation: "DELETE" } });
    }
  });
}
