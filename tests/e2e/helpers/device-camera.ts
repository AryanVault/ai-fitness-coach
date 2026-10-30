import type { Page } from "@playwright/test";

export async function installDeviceCamera(page: Page) {
  await page.addInitScript(() => {
    const state = {
      frames: 0, angle: 170, visibility: .99, poseCount: 1, workerError: false,
      denied: false, rearUnavailable: false, requests: [] as Array<{ facing: string; width?: number }>,
      deferAcquisition: false, releaseAcquisition: null as null | (()=>void),
      tracks: [] as MediaStreamTrack[],
      audios: [] as HTMLAudioElement[],
    };
    (window as any).__deviceCamera = state;
    const NativeAudio=window.Audio;
    window.Audio=class extends NativeAudio {
      constructor(src?:string) { super(src); state.audios.push(this); }
    };
    const NativeWorker = window.Worker;
    window.Worker = class {
      onmessage: ((event: any) => void) | null = null;
      closed = false;
      constructor(url: string | URL, options?: WorkerOptions) {
        if (!String(url).includes("/mediapipe/pose-worker.js")) return new NativeWorker(url, options) as any;
      }
      postMessage(message: any) {
        const aspect = message.bitmap ? message.bitmap.width / message.bitmap.height : 1;
        message.bitmap?.close();
        const send = (data: any) => queueMicrotask(() => { if (!this.closed) this.onmessage?.({ data: { id: message.id, ...data } }); });
        if (message.type === "init") { send({}); return; }
        if (state.workerError) { send({ error: "Synthetic worker failure" }); return; }
        const landmarks = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: state.visibility }));
        for (const [i,x,y] of [[11,.38,.25],[12,.62,.25],[13,.38,.43],[14,.62,.43],[15,.34,.6],[16,.66,.6],[23,.42,.65],[24,.58,.65],[25,.42,.78],[26,.58,.78],[27,.42,.94],[28,.58,.94]]) landmarks[i] = { x,y,z:0,visibility:state.visibility };
        const radians = state.angle * Math.PI / 180;
        for(const [elbow,wrist,direction] of [[13,15,1],[14,16,-1]]) {
          landmarks[wrist] = { x:landmarks[elbow].x + .16*Math.sin(radians)*direction/aspect, y:landmarks[elbow].y - .16*Math.cos(radians), z:0, visibility:state.visibility };
        }
        state.frames++;
        send({ landmarks, worldLandmarks:[], brightness:100, latencyMs:2, poseCount:state.poseCount, delegate:"CPU" });
      }
      terminate() { this.closed = true; }
    } as any;
    const acquire = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      const settings = typeof constraints?.video === "object" ? constraints.video : {};
      const mode = settings.facingMode;
      const facing = typeof mode === "string" ? mode : Array.isArray(mode) ? mode[0] : mode?.exact ?? mode?.ideal ?? "user";
      state.requests.push({ facing: String(facing), width: typeof settings.width === "object" ? Number(settings.width.ideal) : undefined });
      if (state.denied) throw new DOMException("Permission denied by test", "NotAllowedError");
      if (state.deferAcquisition) await new Promise<void>(resolve=>{state.releaseAcquisition=resolve;});
      if (facing === "environment" && state.rearUnavailable) throw new DOMException("Rear camera absent in test", "NotFoundError");
      // Chromium has one fake physical device. Simulate two device identities
      // while retaining real browser video tracks and capture callbacks.
      const stream = await acquire({ ...constraints, video: typeof constraints?.video === "object" ? { ...constraints.video, facingMode: undefined } : constraints?.video });
      for(const track of stream.getVideoTracks()) {
        const original = track.getSettings.bind(track);
        track.getSettings = () => ({ ...original(), facingMode: String(facing) });
        state.tracks.push(track);
      }
      return stream;
    };
  });
}

export async function holdPose(page: Page, angle: number, frameCount = 6) {
  const before = await page.evaluate(value => { const state=(window as any).__deviceCamera; state.angle=value; return state.frames; }, angle);
  await page.waitForFunction(({before,count}) => (window as any).__deviceCamera.frames >= before+count, { before, count:frameCount });
}

export async function movePose(page: Page, from: number, to: number) {
  const steps=Math.ceil(Math.abs(to-from)/15);
  for(let step=1;step<=steps;step++) await holdPose(page,from+(to-from)*step/steps,1);
}
