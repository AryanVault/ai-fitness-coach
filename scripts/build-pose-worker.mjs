import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("public/mediapipe", { recursive: true });
await build({
  entryPoints: ["src/lib/pose/tracking.worker.ts"],
  outfile: "public/mediapipe/pose-worker.js",
  bundle: true,
  platform: "browser",
  format: "iife",
  target: ["es2020"],
  legalComments: "eof",
  sourcemap: false,
  minify: true,
  logLevel: "warning",
});
console.log("Classic MediaPipe worker emitted");
await build({
  entryPoints: ["src/lib/pose/movenet.worker.ts"],
  outfile: "public/movenet/movenet-worker.js",
  bundle: true, platform: "browser", format: "iife", target: ["es2020"],
  legalComments: "eof", sourcemap: false, minify: true, logLevel: "warning",
});
const { cp } = await import("node:fs/promises");
await mkdir("public/movenet/wasm", {recursive:true});
for (const filename of ["tfjs-backend-wasm.wasm","tfjs-backend-wasm-simd.wasm","tfjs-backend-wasm-threaded-simd.wasm"]) {
  await cp(`node_modules/@tensorflow/tfjs-backend-wasm/dist/${filename}`, `public/movenet/wasm/${filename}`);
}
console.log("Local MoveNet worker and WASM emitted");
