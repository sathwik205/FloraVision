import * as tf from "@tensorflow/tfjs";
import type { Crop } from "./types";
export interface ModelPackage {
  format: string;
  metadata: {
    crop: string;
    architecture: string;
    preprocessing: string;
    input_size: number[];
    labels: string[];
    version: string;
    sha256?: string;
  };
  layers: {
    type: string;
    config: Record<string, any>;
    weights: { shape: number[]; values: number[] }[];
  }[];
  checks: { fill: number; scores: number[] }[];
}
export function validatePackage(data: ModelPackage, crops: Crop[]) {
  if (data?.format !== "floravision-browser-v1")
    throw new Error(
      "Use the exported compact model JSON, not a Keras file or metadata.json.",
    );
  const meta = data.metadata,
    crop = crops.find((c) => c.id === meta?.crop);
  if (
    !crop ||
    meta.architecture !== "compact" ||
    meta.preprocessing !== "rgb-bilinear-unit-v1" ||
    JSON.stringify(meta.input_size) !== "[128,128]" ||
    typeof meta.version !== "string"
  )
    throw new Error("Model contract does not match the project.");
  if (
    !Array.isArray(meta.labels) ||
    meta.labels.length !== crop.labels.length ||
    new Set(meta.labels).size !== meta.labels.length ||
    meta.labels.some((l) => !crop.labels.includes(l))
  )
    throw new Error("Invalid label mapping.");
  const expected = [
    "SeparableConv2D",
    "MaxPooling2D",
    "SeparableConv2D",
    "MaxPooling2D",
    "SeparableConv2D",
    "MaxPooling2D",
    "SeparableConv2D",
    "MaxPooling2D",
    "GlobalAveragePooling2D",
    "Dense",
  ];
  if (
    !Array.isArray(data.layers) ||
    JSON.stringify(data.layers.map((l) => l.type)) !== JSON.stringify(expected)
  )
    throw new Error("Unsupported network architecture.");
  let count = 0;
  for (const layer of data.layers) {
    if (!Array.isArray(layer.weights)) throw new Error("Missing weights.");
    for (const weight of layer.weights) {
      if (
        !Array.isArray(weight.shape) ||
        !weight.shape.length ||
        weight.shape.some((n) => !Number.isInteger(n) || n < 1 || n > 4096)
      )
        throw new Error("Invalid weight shape.");
      const size = weight.shape.reduce((a, b) => a * b, 1);
      count += size;
      if (
        count > 2_000_000 ||
        !Array.isArray(weight.values) ||
        weight.values.length !== size ||
        weight.values.some((n) => !Number.isFinite(n))
      )
        throw new Error("Invalid model weights.");
    }
  }
  if (
    !Array.isArray(data.checks) ||
    data.checks.length !== 3 ||
    new Set(data.checks.map((c) => c.fill)).size !== 3 ||
    data.checks.some(
      (c) =>
        ![0, 0.5, 1].includes(c.fill) ||
        !Array.isArray(c.scores) ||
        c.scores.length !== meta.labels.length ||
        c.scores.some((n) => !Number.isFinite(n)),
    )
  )
    throw new Error("Missing Keras reference checks.");
  return meta;
}
export function verifyScores(scores: number[], count: number) {
  if (
    scores.length !== count ||
    scores.some((v) => !Number.isFinite(v) || v < 0 || v > 1) ||
    Math.abs(scores.reduce((a, b) => a + b, 0) - 1) > 0.005
  )
    throw new Error("Model returned invalid class scores.");
}
export async function constructModel(data: ModelPackage, crops: Crop[]) {
  const meta = validatePackage(data, crops);
  await tf.ready();
  const model = tf.sequential();
  try {
    for (let i = 0; i < data.layers.length; i++) {
      const spec = data.layers[i],
        c = spec.config;
      let layer;
      if (spec.type === "SeparableConv2D") {
        if (
          !Number.isInteger(c.filters) ||
          c.filters < 1 ||
          c.filters > 256 ||
          c.activation !== "relu" ||
          JSON.stringify(c.kernel_size) !== "[3,3]" ||
          JSON.stringify(c.strides) !== "[1,1]" ||
          c.depth_multiplier !== 1 ||
          c.padding !== "same" ||
          c.use_bias !== true
        )
          throw new Error("Unsupported convolution configuration.");
        layer = tf.layers.separableConv2d({
          filters: c.filters,
          kernelSize: c.kernel_size,
          strides: c.strides,
          padding: c.padding,
          depthMultiplier: c.depth_multiplier,
          activation: c.activation,
          useBias: true,
          ...(i === 0 ? { inputShape: [128, 128, 3] } : {}),
        });
      } else if (spec.type === "MaxPooling2D") {
        if (
          JSON.stringify(c.pool_size) !== "[2,2]" ||
          JSON.stringify(c.strides) !== "[2,2]" ||
          c.padding !== "valid"
        )
          throw new Error("Unsupported pooling configuration.");
        layer = tf.layers.maxPooling2d({
          poolSize: c.pool_size,
          strides: c.strides,
          padding: c.padding,
        });
      } else if (spec.type === "GlobalAveragePooling2D")
        layer = tf.layers.globalAveragePooling2d({});
      else {
        if (
          c.units !== meta.labels.length ||
          c.activation !== "softmax" ||
          c.use_bias !== true
        )
          throw new Error("Invalid output layer.");
        layer = tf.layers.dense({
          units: c.units,
          activation: c.activation,
          useBias: true,
        });
      }
      model.add(layer);
      const expectedWeights = layer.weights.length;
      if (spec.weights.length !== expectedWeights)
        throw new Error("Missing or unexpected layer weights.");
      if (spec.weights.length) {
        const tensors = spec.weights.map((w) =>
          tf.tensor(w.values, w.shape, "float32"),
        );
        try {
          layer.setWeights(tensors);
        } finally {
          tensors.forEach((t) => t.dispose());
        }
      }
    }
    for (const check of data.checks) {
      const input = tf.fill([1, 128, 128, 3], check.fill),
        output = model.predict(input) as tf.Tensor;
      let scores: number[];
      try {
        scores = Array.from(await output.data());
      } finally {
        input.dispose();
        output.dispose();
      }
      verifyScores(scores, meta.labels.length);
      if (scores.some((v, i) => Math.abs(v - check.scores[i]) > 0.001))
        throw new Error("Model failed Keras reference checks.");
    }
    return { model, meta };
  } catch (error) {
    model.dispose();
    throw error;
  }
}
