import {readFile,writeFile,mkdir} from "node:fs/promises";
import {dirname} from "node:path";
import {evaluateTrackingReplay,trackingReplaySchema} from "../src/lib/pose/tracking-benchmark";

async function main() {
const args=process.argv.slice(2);
const input=args[args.indexOf("--input")+1];
if(!args.includes("--input")||!input)throw new Error("Usage: npm run tracking:benchmark -- --input /absolute/path/annotated-comparison.json [--output reports/tracking-comparison.json]");
const output=args.includes("--output")?args[args.indexOf("--output")+1]:"reports/tracking-comparison.json";
const replay=trackingReplaySchema.parse(JSON.parse(await readFile(input,"utf8")));
const result=evaluateTrackingReplay(replay);
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));

}
void main().catch(error=>{console.error(error instanceof Error?error.message:"Tracking benchmark failed");process.exitCode=1;});
