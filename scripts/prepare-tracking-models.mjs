import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const sources = [];
const manifestPath="public/movenet/download-manifest.json";
const checksum=data=>createHash("sha256").update(data).digest("hex");
let pins=new Map();
try { pins=new Map(JSON.parse(await readFile(manifestPath,"utf8")).map(item=>[item.path,item.sha256])); }
catch(error) { if(error.code!=="ENOENT")throw error; }
async function download(url, path) {
  await mkdir(path.slice(0,path.lastIndexOf("/")),{recursive:true});
  const expected=pins.get(path);
  try {
    const cached=await readFile(path);
    if(cached.length>1000 && (!expected || checksum(cached)===expected)) {
      sources.push({path,url,bytes:cached.length,sha256:checksum(cached)});
      return;
    }
  } catch(error) { if(error.code!=="ENOENT")throw error; }
  const response=await fetch(url,{signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw new Error(`Model download failed (${response.status}): ${path}`);
  const data=Buffer.from(await response.arrayBuffer());
  if(data.length<1000 || response.headers.get("content-type")?.includes("text/html"))throw new Error(`Invalid model artifact: ${path}`);
  const sha256=checksum(data);
  if(expected && sha256!==expected)throw new Error(`Model checksum mismatch: ${path}`);
  await writeFile(path,data);
  sources.push({path,url,bytes:data.length,sha256});
}
await download("https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task","public/mediapipe/models/pose_landmarker_heavy.task");
const base="https://tfhub.dev/google/tfjs-model/movenet/singlepose/thunder/4/";
await download(`${base}model.json?tfjs-format=file`,"public/movenet/thunder/model.json");
const model=JSON.parse(await readFile("public/movenet/thunder/model.json","utf8"));
for(const group of model.weightsManifest) for(const path of group.paths) {
  if(!/^group\d+-shard\d+of\d+\.bin$/.test(path))throw new Error("Unexpected model manifest path");
  await download(`${base}${path}?tfjs-format=file`,`public/movenet/thunder/${path}`);
}
if(sources.length)await writeFile(manifestPath,JSON.stringify(sources,null,2)+"\n");
console.log("Heavy and MoveNet Thunder model artifacts ready. Inference uses local assets.");
