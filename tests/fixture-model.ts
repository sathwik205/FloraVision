import { crops } from "../lib/catalog";
import type { ModelPackage } from "../lib/model-engine";
export function softmax(values: number[]) {
  const exps = values.map(Math.exp),
    sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}
export function expected(value: number) {
  return softmax([
    value + Math.log(0.6),
    Math.log(0.3),
    -value + Math.log(0.1),
  ]);
}
export function fixtureModel(): ModelPackage {
  const weight = (shape: number[]) => ({
    shape,
    values: Array(shape.reduce((a, b) => a * b, 1)).fill(0) as number[],
  });
  const layers: ModelPackage["layers"] = [];
  let channels = 3;
  for (const width of [2, 3, 4, 5]) {
    const depthwise = weight([3, 3, channels, 1]);
    for (let c = 0; c < channels; c++) depthwise.values[4 * channels + c] = 1;
    const pointwise = weight([1, 1, channels, width]);
    for (let c = 0; c < width; c++) pointwise.values[c] = 1;
    layers.push({
      type: "SeparableConv2D",
      config: {
        filters: width,
        kernel_size: [3, 3],
        strides: [1, 1],
        padding: "same",
        depth_multiplier: 1,
        activation: "relu",
        use_bias: true,
      },
      weights: [depthwise, pointwise, weight([width])],
    });
    layers.push({
      type: "MaxPooling2D",
      config: { pool_size: [2, 2], strides: [2, 2], padding: "valid" },
      weights: [],
    });
    channels = width;
  }
  layers.push({ type: "GlobalAveragePooling2D", config: {}, weights: [] });
  const dense = weight([channels, 3]);
  dense.values[0] = 1;
  dense.values[2] = -1;
  layers.push({
    type: "Dense",
    config: { units: 3, activation: "softmax", use_bias: true },
    weights: [
      dense,
      { shape: [3], values: [Math.log(0.6), Math.log(0.3), Math.log(0.1)] },
    ],
  });
  return {
    format: "floravision-browser-v1",
    metadata: {
      crop: "potato",
      architecture: "compact",
      preprocessing: "rgb-bilinear-unit-v1",
      input_size: [128, 128],
      labels: crops[0].labels,
      version: "SYNTHETIC-TEST-ONLY",
    },
    layers,
    checks: [0, 0.5, 1].map((fill) => ({ fill, scores: expected(fill) })),
  };
}
