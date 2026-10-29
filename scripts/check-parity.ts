import fs from "node:fs/promises";
import path from "node:path";
import * as tf from "@tensorflow/tfjs";
import { crops } from "../lib/catalog";
import { constructModel } from "../lib/model-engine";
import { modelPath } from "../lib/model-files";

const folder = process.argv[2];
if (!folder)
  throw new Error("Usage: npm run models:parity -- /path/to/reports");
let checked = 0;
for (const crop of crops) {
  let reference;
  try {
    reference = JSON.parse(
      await fs.readFile(path.join(folder, `${crop.id}-parity.json`), "utf8"),
    );
  } catch (error: any) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  const packageData = JSON.parse(await fs.readFile(modelPath(crop.id), "utf8"));
  if (
    reference.crop !== crop.id ||
    reference.model_sha256 !== packageData.metadata.sha256
  )
    throw new Error(`${crop.id}: reference belongs to a different model`);
  if (!Array.isArray(reference.fixtures) || reference.fixtures.length < 1)
    throw new Error(`${crop.id}: no image fixtures`);
  const { model, meta } = await constructModel(packageData, crops);
  try {
    for (const fixture of reference.fixtures) {
      if (
        fixture.tensor?.length !== 128 * 128 * 3 ||
        fixture.scores?.length !== meta.labels.length ||
        fixture.tensor.some((x: number) => !Number.isFinite(x)) ||
        fixture.scores.some((x: number) => !Number.isFinite(x))
      )
        throw new Error("Invalid fixture");
      const input = tf.tensor4d(fixture.tensor, [1, 128, 128, 3]);
      const output = model.predict(input) as tf.Tensor;
      try {
        const values = Array.from(await output.data());
        const delta = Math.max(
          ...values.map((value, i) => Math.abs(value - fixture.scores[i])),
        );
        if (delta > 0.001)
          throw new Error(
            `${crop.id}: image parity failed; max difference ${delta}`,
          );
        console.log(
          `${crop.id}: image parity passed; max difference ${delta.toExponential(2)}`,
        );
        checked++;
      } finally {
        input.dispose();
        output.dispose();
      }
    }
  } finally {
    model.dispose();
  }
}
if (!checked)
  throw new Error(
    "No parity fixtures found. Extract FloraVision-Evidence.zip and pass its reports folder.",
  );
console.log(`Verified ${checked} real-image reference tensors.`);
