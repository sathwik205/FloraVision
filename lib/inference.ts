import fs from "node:fs/promises";
import * as tf from "@tensorflow/tfjs";
import { crops, cropById } from "./catalog";
import { AppError } from "./errors";
import {
  constructModel,
  verifyScores,
  type ModelPackage,
} from "./model-engine";
const cache = new Map<string, ReturnType<typeof constructModel>>();
import { modelPath, modelInstalled } from "./model-files";
export { modelInstalled } from "./model-files";
export async function loadModel(crop: string) {
  if (!cropById(crop))
    throw new AppError("INVALID_CROP", "Choose a supported crop.");
  if (!cache.has(crop)) {
    const promise = (async () => {
      if (!(await modelInstalled(crop)))
        throw new AppError(
          "MODEL_MISSING",
          `The ${cropById(crop)!.name.toLowerCase()} model has not been installed. Open Model studio for setup.`,
          503,
        );
      try {
        const data = JSON.parse(
          await fs.readFile(modelPath(crop), "utf8"),
        ) as ModelPackage;
        if (data.metadata?.crop !== crop)
          throw new Error("Model crop does not match filename");
        return await constructModel(data, crops);
      } catch (error) {
        console.error(
          "Model validation:",
          crop,
          error instanceof Error ? error.message : "unknown",
        );
        throw new AppError(
          "MODEL_INVALID",
          "The model could not pass validation. Re-export it using the separate Colab notebook.",
          503,
        );
      }
    })();
    cache.set(crop, promise);
    promise.catch(() => {
      cache.delete(crop);
    });
  }
  return cache.get(crop)!;
}
export async function infer(crop: string, pixels: Float32Array) {
  const { model, meta } = await loadModel(crop);
  const tensor = tf.tensor4d(pixels, [1, 128, 128, 3]);
  let output: tf.Tensor | undefined;
  try {
    output = model.predict(tensor) as tf.Tensor;
    const scores = Array.from(await output.data());
    verifyScores(scores, meta.labels.length);
    return { scores, meta };
  } finally {
    tensor.dispose();
    output?.dispose();
  }
}
