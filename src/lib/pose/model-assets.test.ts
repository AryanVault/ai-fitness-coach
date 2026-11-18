import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";

const prepare=path.resolve("scripts/prepare-tracking-models.mjs");
const hash=(data:Buffer)=>createHash("sha256").update(data).digest("hex");

it("repairs missing or corrupt model assets without losing cached provenance or accepting a changed download",()=>{
  const root=mkdtempSync(path.join(tmpdir(),"fitcoach-model-assets-"));
  const heavy="public/mediapipe/models/pose_landmarker_heavy.task";
  const model="public/movenet/thunder/model.json";
  const shard="public/movenet/thunder/group1-shard1of1.bin";
  const manifest="public/movenet/download-manifest.json";
  const modelBytes=Buffer.from(JSON.stringify({weightsManifest:[{paths:["group1-shard1of1.bin"]}]}).padEnd(1200," "));
  const assets=new Map([[heavy,Buffer.alloc(1200,104)],[model,modelBytes],[shard,Buffer.alloc(1200,102)]]);
  const write=(file:string,data:string|Buffer)=>{const full=path.join(root,file);mkdirSync(path.dirname(full),{recursive:true});writeFileSync(full,data);};
  const bootstrap=path.join(root,"fetch-stub.mjs");
  writeFileSync(bootstrap,'globalThis.fetch=async()=>new Response(new Uint8Array(1200).fill(Number(process.env.FIXTURE_BYTE)),{headers:{"content-type":"application/octet-stream"}});');
  const run=(byte=102)=>execFileSync(process.execPath,["--import",pathToFileURL(bootstrap).href,prepare],{cwd:root,env:{NODE_ENV:"test",FIXTURE_BYTE:String(byte)},stdio:"pipe"});
  const pins=[...assets].map(([file,data])=>({path:file,sha256:hash(data)}));
  try {
    write(heavy,assets.get(heavy)!);write(model,modelBytes);write(manifest,JSON.stringify(pins));
    // The manifest already describes the intended asset; only its local file is missing.
    run();
    const repaired=JSON.parse(readFileSync(path.join(root,manifest),"utf8"));
    expect(repaired.map((item:{path:string})=>item.path).sort()).toEqual([...assets.keys()].sort());
    expect(hash(readFileSync(path.join(root,shard)))).toBe(hash(assets.get(shard)!));
    // Re-running with a fully cached set must retain every source and hash.
    run();expect(JSON.parse(readFileSync(path.join(root,manifest),"utf8"))).toEqual(repaired);
    write(shard,Buffer.alloc(1200,120));run();
    expect(hash(readFileSync(path.join(root,shard)))).toBe(hash(assets.get(shard)!));
    write(shard,Buffer.alloc(1200,120));
    expect(()=>run(121)).toThrow();
    expect(JSON.parse(readFileSync(path.join(root,manifest),"utf8"))).toEqual(repaired);
  } finally {rmSync(root,{recursive:true,force:true});}
});
