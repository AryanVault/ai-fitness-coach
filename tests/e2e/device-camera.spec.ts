import { devices, expect, test } from "@playwright/test";
import { holdPose, installDeviceCamera, movePose } from "./helpers/device-camera";
import { textContrast } from "./helpers/contrast";

test.use({launchOptions:{args:["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]},permissions:["camera"],trace:"off"});
const targets = [
  { name:"Laptop Chrome", use:{ viewport:{width:1440,height:900} } },
  { name:"Android Chrome emulation", use:{userAgent:devices["Pixel 7"].userAgent,viewport:devices["Pixel 7"].viewport,deviceScaleFactor:devices["Pixel 7"].deviceScaleFactor,isMobile:true,hasTouch:true} },
];
for(const target of targets) test.describe(target.name, () => {
  test.use(target.use);
  const pageErrors = new WeakMap<object,string[]>();
  test.beforeEach(async({page,baseURL}) => {
    test.skip(process.env.E2E_REAL_DATABASE !== "true" || !!process.env.PLAYWRIGHT_USE_BUILD,"Requires local development auth and isolated test accounts");
    page.setDefaultTimeout(15000);
    const errors:string[]=[];pageErrors.set(page,errors);page.on("pageerror",error=>errors.push(error.message));
    const origin = new URL(baseURL!).origin;
    expect((await page.request.post("/api/auth/sign-up/email",{ headers:{origin},data:{email:`device-${crypto.randomUUID()}@example.test`,password:"Test-only-fitness-123!",name:"Device Camera Test"} })).ok()).toBe(true);
    await installDeviceCamera(page);
  });
  test.afterEach(async({page,baseURL}) => {
    if(test.info().status !== test.info().expectedStatus && !page.isClosed()) {
      console.log("Device failure state",JSON.stringify(await page.evaluate(()=>({url:location.pathname,buttons:Array.from(document.querySelectorAll("button")).map(button=>({text:button.textContent,disabled:button.disabled})),messages:document.body.innerText.slice(-2000),frames:(window as any).__deviceCamera?.frames})).catch(()=>({diagnostics:"Page unavailable"}))));
    }
    const request=page.request; await page.close();
    await request.delete("/api/account",{headers:{origin:new URL(baseURL!).origin},data:{confirmation:"DELETE"}});
    expect(pageErrors.get(page) ?? []).toEqual([]);
  });

  test("fitness counts a complete curl, rejects interrupted motion, and saves evidence",async({page}) => {
    await page.goto("/coach/workout?exercise=bicep_curl");
    const confidenceValue=page.getByText("Uncalibrated",{exact:true});
    await expect(confidenceValue).toBeVisible();
    expect(await confidenceValue.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Start session",exact:true})).toBeEnabled();
    const request = await page.evaluate(()=>(window as any).__deviceCamera.requests[0]);
    expect(request.width).toBe(target.name.startsWith("Android") ? 960 : 1280);
    await page.getByRole("button",{name:"Start session",exact:true}).click();
    const stopControl=page.getByRole("button",{name:"Stop session",exact:true}).first();
    await expect(stopControl).toBeVisible();
    await holdPose(page,170,8); await movePose(page,170,50); await holdPose(page,50,12); await movePose(page,50,170); await holdPose(page,170,12);
    await expect(page.getByText("1 reps",{exact:true}).first()).toBeVisible();
    await movePose(page,170,50); await holdPose(page,50,12);
    await page.evaluate(()=>{(window as any).__deviceCamera.poseCount=2;});
    await expect(page.getByText(/More than one person detected/).first()).toBeVisible();
    await page.evaluate(()=>{(window as any).__deviceCamera.poseCount=1;});
    await movePose(page,50,170); await holdPose(page,170,12);
    await expect(page.getByText("1 reps",{exact:true}).first()).toBeVisible();
    for(const dark of [false,true]) {
      await page.evaluate(value=>document.documentElement.classList.toggle("dark",value),dark);
      // Move away from the control so contrast measures its resting fill.
      await page.mouse.move(0,0);
      await stopControl.evaluate(async element=>{await Promise.all(element.getAnimations().map(animation=>animation.finished.catch(()=>{})));});
      const contrast=await textContrast(stopControl);
      expect(contrast.ratio,JSON.stringify({dark,...contrast})).toBeGreaterThanOrEqual(4.5);
    }
    await page.evaluate(()=>document.documentElement.classList.remove("dark"));
    const saving=page.waitForResponse(r=>r.url().endsWith("/api/workouts")&&r.request().method()==="POST");
    void saving.catch(()=>{});
    await page.getByRole("button",{name:"Stop session",exact:true}).first().click();
    const response=await saving;expect(response.ok(),await response.text()).toBe(true);
    expect(response.request().postDataJSON().totalReps).toBe(1);
  });

  test("permission denial is actionable and retry acquires only one new stream",async({page}) => {
    await page.goto("/coach/workout");
    await page.evaluate(()=>{(window as any).__deviceCamera.denied=true;});
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(page.getByText(/Camera permission was blocked/).first()).toBeVisible();
    expect(await page.evaluate(()=>(window as any).__deviceCamera.requests.length)).toBe(1);
    await page.evaluate(()=>{(window as any).__deviceCamera.denied=false;});
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Start session",exact:true})).toBeEnabled();
    expect(await page.evaluate(()=>(window as any).__deviceCamera.requests.length)).toBe(2);
  });

  test("profile failure blocks session start with a recovery instruction",async({page}) => {
    await page.route("**/api/profile",route=>route.fulfill({status:503,json:{error:"Synthetic profile outage"}}));
    await page.goto("/coach/workout?exercise=bicep_curl");
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(page.getByText("Your saved profile could not load. Reload this page before starting a session.",{exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Finish calibration",exact:true})).toBeDisabled();
    await expect(page.getByRole("button",{name:"Stop session",exact:true})).toHaveCount(0);
  });

  test("changing exercise during pending camera permission leaves retry usable",async({page}) => {
    await page.goto("/coach/workout");
    await page.evaluate(()=>{(window as any).__deviceCamera.deferAcquisition=true;});
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await page.waitForFunction(()=>(window as any).__deviceCamera.requests.length===1);
    await page.getByRole("button",{name:"Bicep Curl",exact:true}).click();
    await page.evaluate(()=>{const state=(window as any).__deviceCamera;state.deferAcquisition=false;state.releaseAcquisition();});
    await expect(page.getByRole("button",{name:"Enable camera",exact:true})).toBeEnabled();
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Start session",exact:true})).toBeEnabled();
    expect(await page.evaluate(()=>(window as any).__deviceCamera.tracks.filter((track:MediaStreamTrack)=>track.readyState==="live").length)).toBe(1);
  });

  test("changing exercise preserves the active session and avoids stale summary updates",async({page}) => {
    let summaries=0;page.on("request",r=>{if(r.url().endsWith("/api/coach/summarize"))summaries++;});
    await page.goto("/coach/workout?exercise=bicep_curl");
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Start session",exact:true})).toBeEnabled();
    await page.getByRole("button",{name:"Start session",exact:true}).click();
    await expect(page.getByRole("button",{name:"Stop session",exact:true}).first()).toBeVisible();
    await holdPose(page,170,8);
    const saved=page.waitForResponse(r=>r.url().endsWith("/api/workouts")&&r.request().method()==="POST");void saved.catch(()=>{});
    await page.getByRole("button",{name:"Jumping Jack",exact:true}).click();
    const response=await saved;expect(response.ok(),await response.text()).toBe(true);
    expect(response.request().postDataJSON().exerciseType).toBe("bicep_curl");
    await expect(page.getByRole("button",{name:"Enable camera",exact:true})).toBeEnabled();
    expect(summaries).toBe(0);
  });

  test("late summary cannot replace a new exercise or stop its camera",async({page}) => {
    let releaseSummary:()=>void=()=>{};
    await page.route("**/api/coach/summarize",async route=>{
      await new Promise<void>(resolve=>{releaseSummary=resolve;});
      await route.fulfill({status:200,json:{summary:"Retired exercise summary"}});
    });
    await page.goto("/coach/workout?exercise=bicep_curl");
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Start session",exact:true})).toBeEnabled();
    await page.getByRole("button",{name:"Start session",exact:true}).click();
    await holdPose(page,170,8);
    const summaryRequested=page.waitForRequest(request=>request.url().endsWith("/api/coach/summarize"));void summaryRequested.catch(()=>{});
    await page.getByRole("button",{name:"Stop session",exact:true}).first().click();
    await summaryRequested;
    await page.getByRole("button",{name:"Jumping Jack",exact:true}).click();
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    const summaryResponse=page.waitForResponse(response=>response.url().endsWith("/api/coach/summarize"));void summaryResponse.catch(()=>{});
    releaseSummary();await summaryResponse;
    await expect(page.getByRole("button",{name:"Start session",exact:true})).toBeEnabled();
    await expect(page.getByText("Retired exercise summary",{exact:true})).toHaveCount(0);
    expect(await page.evaluate(()=>(window as any).__deviceCamera.tracks.filter((track:MediaStreamTrack)=>track.readyState==="live").length)).toBe(1);
  });

  test("rear switching keeps labels and mirroring truthful and recovers after failure",async({page}) => {
    await page.goto("/coach/workout");
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Start session",exact:true})).toBeEnabled();
    await page.getByRole("button",{name:"Switch to rear camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Switch to front camera",exact:true})).toBeVisible();
    expect(await page.locator("video").evaluate(video=>getComputedStyle(video).transform)).toBe("none");
    await page.getByRole("button",{name:"Switch to front camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Switch to rear camera",exact:true})).toBeVisible();
    await page.evaluate(()=>{(window as any).__deviceCamera.rearUnavailable=true;});
    await page.getByRole("button",{name:"Switch to rear camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Enable camera",exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Start session",exact:true})).toBeEnabled();
  });

  test("background interruption pauses dance audio and fresh tracking resumes silently",async({page}) => {
    await page.goto("/coach/dance");
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Start session",exact:true})).toBeEnabled();
    await page.getByRole("button",{name:"Start session",exact:true}).click();
    const audio=page.getByRole("group",{name:"Routine audio transport"});
    await expect(audio.getByRole("button",{name:"Stop routine audio",exact:true})).toBeVisible().catch(async error=>{console.log("Audio startup evidence",await page.evaluate(()=>(window as any).__deviceCamera.audios.map((a:HTMLAudioElement)=>({paused:a.paused,time:a.currentTime,readyState:a.readyState,error:a.error?.code}))));throw error;});
    await page.evaluate(()=>{
      Object.defineProperty(document,"hidden",{configurable:true,get:()=>(window as any).__testHidden});
      (window as any).__testHidden=true;document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(audio.getByRole("button",{name:"Play routine audio",exact:true})).toBeEnabled();
    const frames=await page.evaluate(()=>(window as any).__deviceCamera.frames);
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    expect(await page.evaluate(()=>(window as any).__deviceCamera.frames)).toBeLessThanOrEqual(frames+1);
    await page.evaluate(()=>{(window as any).__testHidden=false;document.dispatchEvent(new Event("visibilitychange"));});
    await page.waitForFunction(before=>(window as any).__deviceCamera.frames>before+5,frames);
    await expect(page.getByTestId("dance-timing-score")).toHaveText("Unavailable");
    await expect(audio.getByRole("button",{name:"Play routine audio",exact:true})).toBeEnabled();
  });

  test("failed dance save survives reload and retries exactly once",async({page}) => {
    let unavailable=true;const ids:string[]=[];
    await page.route("**/api/workouts",route=>{
      if(route.request().method()!=="POST")return route.continue();
      ids.push(route.request().postDataJSON().clientSessionId);
      return unavailable ? route.fulfill({status:503,json:{error:"Synthetic save outage"}}) : route.continue();
    });
    await page.goto("/coach/dance");
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Start session",exact:true})).toBeEnabled();
    await page.getByRole("button",{name:"Start session",exact:true}).click();
    await holdPose(page,170,8);
    await page.getByRole("button",{name:"Stop session",exact:true}).first().click();
    await expect(page.getByText("Session kept on this device. Reconnect and retry saving.",{exact:true})).toBeVisible();
    const warning=page.getByText("Session kept on this device. Reconnect and retry saving.",{exact:true});
    const contrast=await textContrast(warning);
    expect(contrast.ratio,JSON.stringify(contrast)).toBeGreaterThanOrEqual(4.5);
    await page.reload();
    await expect(page.getByText("1 session waiting to save on this device.",{exact:true})).toBeVisible();
    unavailable=false;
    const retried=page.waitForResponse(r=>r.url().endsWith("/api/workouts")&&r.request().method()==="POST");
    await page.getByRole("button",{name:"Retry saving",exact:true}).click();
    const response=await retried;expect(response.ok(),await response.text()).toBe(true);
    await expect(page.getByRole("button",{name:"Retry saving",exact:true})).toHaveCount(0);
    const sessions=await(await page.request.get("/api/workouts")).json();
    expect(sessions.workouts).toHaveLength(1);expect(ids).toHaveLength(2);expect(new Set(ids).size).toBe(1);
    await expect(page.getByText(/1 saved attempts for this phrase/)).toBeVisible();
  });

  if(target.name.startsWith("Android")) test("touch-dragged PiP remains usable after landscape rotation",async({page}) => {
    await page.setViewportSize({width:412,height:1000});
    await page.goto("/coach/workout");
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Start session",exact:true})).toBeEnabled();
    await page.getByRole("button",{name:"Start session",exact:true}).click();
    const preview=page.getByTestId("camera-preview");
    await preview.getByRole("button",{name:"PiP",exact:true}).click();
    const grip=preview.getByRole("button",{name:"Camera monitor",exact:true});
    const bounds=await grip.boundingBox();expect(bounds).not.toBeNull();
    const session=await page.context().newCDPSession(page);
    const point={x:bounds!.x+bounds!.width/2,y:bounds!.y+bounds!.height/2};
    await session.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[point]});
    await session.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:point.x,y:point.y-350}]});
    await session.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    await page.setViewportSize({width:851,height:393});
    await page.evaluate(()=>window.dispatchEvent(new Event("orientationchange")));
    await expect(page.getByRole("button",{name:"Minimize camera preview",exact:true})).toBeInViewport();
    await page.getByRole("button",{name:"Minimize camera preview",exact:true}).click();
    await page.getByRole("button",{name:"Restore camera",exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });

  for(const failure of ["ended","workerError"] as const) test(`dance camera ${failure} stops audio and saves the active session`,async({page}) => {
    await page.goto("/coach/dance");
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(page.getByRole("button",{name:"Start session",exact:true})).toBeEnabled();
    await page.getByRole("button",{name:"Start session",exact:true}).click();
    const audio=page.getByRole("group",{name:"Routine audio transport"});
    await expect(audio.getByRole("button",{name:"Stop routine audio",exact:true})).toBeVisible();
    const saving=page.waitForResponse(r=>r.url().endsWith("/api/workouts")&&r.request().method()==="POST");
    void saving.catch(()=>{});
    await page.evaluate(failure=>{
      const state=(window as any).__deviceCamera;
      if(failure==="workerError") state.workerError=true;
      else {const track=state.tracks.at(-1);track.stop();track.dispatchEvent(new Event("ended"));}
    },failure);
    await expect(audio.getByRole("button",{name:"Play routine audio",exact:true})).toBeDisabled();
    expect((await saving).ok()).toBe(true);
    await expect.poll(()=>page.evaluate(()=>(window as any).__deviceCamera.tracks.every((track:MediaStreamTrack)=>track.readyState==="ended"))).toBe(true);
  });
});
