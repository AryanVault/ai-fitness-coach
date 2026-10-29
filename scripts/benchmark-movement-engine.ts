import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { benchmarkMovementReplay, movementReplaySchema } from "../src/lib/dance/replay-benchmark";
import { syntheticMovementReplay } from "../fixtures/movement-engine/synthetic";

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args.includes("--input") ? args[args.indexOf("--input")+1] : null;
  const outputPath = args.includes("--output") ? args[args.indexOf("--output")+1] : "reports/movement-engine-synthetic.json";
  if (!outputPath || (args.includes("--input") && !inputPath)) throw new Error("Usage: npm run camera:benchmark -- [--input labeled-replay.json] [--output report.json]");
  const input = inputPath ? movementReplaySchema.parse(JSON.parse(await readFile(inputPath,"utf8"))) : syntheticMovementReplay;
  const report = benchmarkMovementReplay(input);
  await mkdir(path.dirname(outputPath),{recursive:true});
  await writeFile(outputPath,JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({output:outputPath,analysisVersion:report.analysisVersion,cases:report.cases.length,syntheticCases:report.cases.filter(c=>c.synthetic).length,falsePositives:report.cases.reduce((n,c)=>n+c.falsePositives,0),falseNegatives:report.cases.reduce((n,c)=>n+c.falseNegatives,0)}));
}
main().catch(error=>{console.error(error instanceof Error ? error.message : "Replay benchmark failed");process.exitCode=1;});
