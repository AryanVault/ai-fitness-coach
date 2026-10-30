import { expect, test } from "@playwright/test";
import { holdPose, installDeviceCamera } from "./helpers/device-camera";

test.use({launchOptions:{args:["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream","--disable-gpu"]},permissions:["camera"],trace:"off"});

test("local alternative and high-detail workers execute real inference",async({page})=>{
  test.setTimeout(180000);
  await page.goto("/login",{waitUntil:"domcontentloaded"});
  for(const model of [{path:"/movenet/movenet-worker.js",quality:"thunder"},{path:"/mediapipe/pose-worker.js",quality:"heavy"}]){
    const result=await page.evaluate(async model=>{
      const worker=new Worker(model.path);
      let id=0;
      const request=(message:Record<string,unknown>,transfer:Transferable[]=[])=>new Promise<any>((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error("Model smoke timeout")),60000);
        worker.onerror=event=>{clearTimeout(timer);reject(new Error(event.message));};
        worker.onmessage=({data})=>{clearTimeout(timer);if(data.error)reject(new Error(data.error));else resolve(data);};
        worker.postMessage({...message,id:++id},transfer);
      });
      try{
        await request({type:"init",quality:model.quality,origin:location.origin});
        const canvas=document.createElement("canvas");canvas.width=640;canvas.height=480;
        const context=canvas.getContext("2d")!;context.fillStyle="#6b8172";context.fillRect(0,0,640,480);
        const bitmap=await createImageBitmap(canvas);
        const data=await request({type:"frame",bitmap,timestampMs:performance.now()},[bitmap]);
        return {count:data.landmarks?.length,finite:data.landmarks?.every((p:any)=>Number.isFinite(p.x)&&Number.isFinite(p.y)),fingerVisibility:data.landmarks?.[17]?.visibility,worldCount:data.worldLandmarks?.length,delegate:data.delegate,latencyMs:data.latencyMs};
      }finally{worker.terminate();}
    },model);
    if(model.quality==="thunder"){
      expect(result.count).toBe(33);expect(result.finite).toBe(true);expect(result.fingerVisibility).toBe(0);expect(result.worldCount).toBe(0);expect(result.delegate).toBe("WASM");
    }else expect(result.count).toBeDefined();
    await test.info().attach(`${model.quality}-inference`,{body:JSON.stringify(result),contentType:"application/json"});
  }
});

for(const viewport of [{width:1440,height:1000},{width:393,height:852}]){
 test(`games work with camera controls at ${viewport.width}px`,async({page,baseURL})=>{
  test.skip(process.env.E2E_REAL_DATABASE!=="true"||!!process.env.PLAYWRIGHT_USE_BUILD,"Requires isolated database and local auth");
  test.setTimeout(90000);page.setDefaultTimeout(15000);await page.setViewportSize(viewport);
  const origin=new URL(baseURL??"http://127.0.0.1:3100").origin;
  const signup=await page.request.post("/api/auth/sign-up/email",{headers:{origin},data:{email:`games-${crypto.randomUUID()}@example.test`,password:"Test-only-fitness-123!",name:"Movement Player"}});expect(signup.ok()).toBe(true);
  try{
    await installDeviceCamera(page);
    await page.goto("/coach/workout",{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>{
      const history:Array<{at:number;text:string}>=[];(window as any).__gameHistory=history;
      new MutationObserver(()=>{
        const text=document.querySelector('[aria-label="Live game guidance"]')?.textContent??"";
        if(text!==history.at(-1)?.text)history.push({at:Math.round(performance.now()),text});
      }).observe(document.body,{subtree:true,childList:true,characterData:true});
    });
    const games=page.getByRole("region",{name:"Movement games"});
    await games.getByRole("button",{name:/Curl bubbles/}).click();
    await expect(games.getByRole("button",{name:"Start game",exact:true})).toBeDisabled();
    await page.getByRole("button",{name:"Enable camera",exact:true}).click();
    await expect(games.getByRole("button",{name:"Start game",exact:true})).toBeEnabled();
    await games.getByRole("button",{name:"Start game",exact:true}).click();
    await holdPose(page,170,40);
    for(const a of [140,110,80,55])await holdPose(page,a,5);
    await holdPose(page,55,15);
    for(const a of [80,110,140,170])await holdPose(page,a,5);
    await holdPose(page,170,20);
    await expect(games.getByText(/Reach the left target/)).toBeVisible({timeout:15000});
    for(const a of [140,110,80,55])await holdPose(page,a,5);
    await holdPose(page,55,15);
    await expect(games.getByText(/Return with control to collect/)).toBeVisible();
    await expect(games.getByTestId("game-points")).toHaveText("0");
    const overlay=page.getByTestId("game-overlay");await expect(overlay).toBeVisible();
    for(const a of [80,110,140,170])await holdPose(page,a,5);
    await holdPose(page,170,20);
    await expect(games.getByTestId("game-points")).toHaveText("100");
    await page.getByRole("button",{name:"Layout",exact:true}).click();
    await expect(page.getByTestId("pose-overlay")).toHaveCSS("object-fit","contain");
    await page.getByRole("button",{name:"3D HUD",exact:true}).click();
    await expect(page.getByTestId("depth-overlay")).toHaveCSS("object-fit","contain");
    await page.getByRole("button",{name:"2D HUD",exact:true}).click();
    await page.screenshot({path:`reports/games-${viewport.width}.png`,fullPage:true});
    await games.getByRole("button",{name:"Pause game",exact:true}).click();
    await expect(page.getByRole("combobox",{name:"Tracking model"})).toBeEnabled();
    await page.getByRole("combobox",{name:"Tracking model"}).selectOption("detail");
    await expect(page.getByRole("combobox",{name:"Tracking model"})).toHaveValue("detail");
    await games.getByRole("button",{name:"Start game",exact:true}).click();
    await games.getByRole("button",{name:"Pause game",exact:true}).click();
    await games.getByRole("combobox",{name:"Game level"}).selectOption("2");
    await games.getByRole("combobox",{name:"Working side"}).selectOption("right");
    await games.getByRole("button",{name:"Restart game",exact:true}).click();
    await expect(games.getByTestId("game-points")).toHaveText("0");
    await games.getByRole("button",{name:/Pushup levels/}).click();
    await games.getByRole("button",{name:"Start game",exact:true}).click();
    await expect(games.getByRole("status")).toContainText(/Tracking paused|calibrat|position/);
    await games.getByRole("button",{name:/Cardio reach/}).click();
    await games.getByRole("button",{name:"Start game",exact:true}).click();
    await games.getByRole("button",{name:"Pause game",exact:true}).click();
    await games.getByRole("button",{name:"Exit game",exact:true}).click();
    await expect(games.getByRole("button",{name:"Start game",exact:true})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }catch(error){
    if(!page.isClosed()){
      console.log("Game failure state:",await page.getByRole("region",{name:"Movement games"}).innerText().catch(()=>"unavailable"));
      console.log("Game history:",await page.evaluate(()=>(window as any).__gameHistory?.slice(-25)));
      await page.screenshot({path:`reports/games-failure-${viewport.width}.png`,fullPage:true}).catch(()=>{});
    }
    throw error;
  }finally{
    test.setTimeout(test.info().timeout+30000);const cleanup=page.request;await page.close();
    await cleanup.delete("/api/account",{headers:{origin},data:{confirmation:"DELETE"}});
  }
 });
}
