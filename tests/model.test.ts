import assert from "node:assert/strict";
import test from "node:test";
import * as tf from "@tensorflow/tfjs";
import {
  constructModel,
  validatePackage,
  verifyScores,
} from "../lib/model-engine";
import { crops } from "../lib/catalog";
import { fixtureModel, expected } from "./fixture-model";

test("compact CNN reconstruction matches an independently calculated full forward pass", async () => {
  const baseline = tf.memory().numTensors;
  const { model } = await constructModel(fixtureModel(), crops);
  const values = Float32Array.from(
    { length: 128 * 128 * 3 },
    (_, i) => ((i * 31) % 997) / 997,
  );
  let avg = 0;
  for (let by = 0; by < 8; by++)
    for (let bx = 0; bx < 8; bx++) {
      let max = 0;
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++)
          max = Math.max(max, values[((by * 16 + y) * 128 + bx * 16 + x) * 3]);
      avg += max / 64;
    }
  const input = tf.tensor4d(values, [1, 128, 128, 3]),
    output = model.predict(input) as tf.Tensor;
  const actual = Array.from(await output.data());
  actual.forEach((value, i) =>
    assert.ok(Math.abs(value - expected(avg)[i]) < 1e-5),
  );
  input.dispose();
  output.dispose();
  model.dispose();
  assert.equal(tf.memory().numTensors, baseline);
});
test("mismatched labels are rejected", () => {
  const model = fixtureModel();
  model.metadata.labels = ["wrong"];
  assert.throws(() => validatePackage(model, crops), /label/);
});
test("reference mismatch rejects model and disposes its tensors", async () => {
  const baseline = tf.memory().numTensors;
  const model = fixtureModel();
  model.checks[0].scores = [1, 0, 0];
  await assert.rejects(() => constructModel(model, crops), /reference/);
  assert.equal(tf.memory().numTensors, baseline);
});
test("missing layer weights are rejected", async () => {
  const model = fixtureModel();
  model.layers[0].weights = [];
  await assert.rejects(() => constructModel(model, crops), /weights/);
});
test("invalid probability outputs are rejected", () => {
  for (const scores of [
    [NaN, 0.5, 0.5],
    [-0.1, 0.5, 0.6],
    [0.5, 0.5, 0.5],
    [1, 0],
  ])
    assert.throws(() => verifyScores(scores, 3));
});
