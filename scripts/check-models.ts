import { crops } from "../lib/catalog";
import { modelInstalled, loadModel } from "../lib/inference";
async function main() {
  let installed = 0,
    failed = 0;
  for (const crop of crops) {
    if (!(await modelInstalled(crop.id))) {
      console.log(`NOT INSTALLED: ${crop.name}`);
      continue;
    }
    installed++;
    try {
      const loaded = await loadModel(crop.id);
      console.log(
        `PASS: ${crop.name} — ${loaded.meta.version}; label mapping, weights and three Keras checks validated.`,
      );
    } catch (error) {
      failed++;
      console.error(
        `FAIL: ${crop.name} — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (!installed)
    console.log(
      "No trained models installed. Add exported JSON files to models/. The demo can run without weights.",
    );
  if (failed) process.exitCode = 1;
}
void main();
