import sharp from "sharp";
import { AppError } from "./errors";
export const MAX_IMAGE_BYTES = 4_000_000;
const MAX_REQUEST_BYTES = 4_250_000;

export async function parseUpload(request: Request): Promise<FormData> {
  const length = Number(request.headers.get("content-length"));
  if (length > MAX_REQUEST_BYTES)
    throw new AppError(
      "UPLOAD_TOO_LARGE",
      "Choose a photograph smaller than 4 MB.",
      413,
    );
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data"))
    throw new AppError(
      "INVALID_REQUEST",
      "Send a crop and image as multipart form data.",
    );
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("MISSING_IMAGE", "Choose a leaf photograph.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new AppError(
          "UPLOAD_TOO_LARGE",
          "Choose a photograph smaller than 4 MB.",
          413,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": contentType },
    }).formData();
  } catch {
    throw new AppError(
      "INVALID_REQUEST",
      "The upload could not be read. Please choose the image again.",
    );
  }
}

// Pillow RGB bilinear: scale-dependent triangle filter, two 8-bit passes,
// and 22-bit integer coefficients. This preserves the training resize contract.
export function coefficients(input: number, output: number) {
  const scale = input / output,
    support = Math.max(1, scale);
  return Array.from({ length: output }, (_, index) => {
    const center = (index + 0.5) * scale;
    const start = Math.max(0, Math.trunc(center - support + 0.5));
    const end = Math.min(input, Math.trunc(center + support + 0.5));
    const weights = Array.from({ length: end - start }, (_, j) =>
      Math.max(0, 1 - Math.abs((j + start - center + 0.5) / support)),
    );
    const sum = weights.reduce((a, b) => a + b, 0);
    return {
      start,
      weights: weights.map((w) => Math.floor((w / sum) * 4194304 + 0.5)),
    };
  });
}
export function resizeRGB(
  raw: Uint8Array,
  width: number,
  height: number,
  target = 128,
): Float32Array {
  if (raw.length !== width * height * 3) throw new Error("Invalid RGB buffer");
  const horizontal = new Uint8Array(target * height * 3),
    result = new Float32Array(target * target * 3);
  const xCoeffs = coefficients(width, target),
    yCoeffs = coefficients(height, target);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < target; x++)
      for (let c = 0; c < 3; c++) {
        const coeff = xCoeffs[x];
        let sum = 2097152;
        for (let j = 0; j < coeff.weights.length; j++)
          sum += raw[(y * width + coeff.start + j) * 3 + c] * coeff.weights[j];
        horizontal[(y * target + x) * 3 + c] = Math.max(
          0,
          Math.min(255, Math.floor(sum / 4194304)),
        );
      }
  for (let y = 0; y < target; y++)
    for (let x = 0; x < target; x++)
      for (let c = 0; c < 3; c++) {
        const coeff = yCoeffs[y];
        let sum = 2097152;
        for (let j = 0; j < coeff.weights.length; j++)
          sum +=
            horizontal[((coeff.start + j) * target + x) * 3 + c] *
            coeff.weights[j];
        result[(y * target + x) * 3 + c] =
          Math.max(0, Math.min(255, Math.floor(sum / 4194304))) / 255;
      }
  return result;
}
export async function preprocessImage(buffer: Buffer) {
  if (buffer.length > MAX_IMAGE_BYTES)
    throw new AppError(
      "UPLOAD_TOO_LARGE",
      "Choose a photograph smaller than 4 MB.",
      413,
    );
  try {
    const decoder = sharp(buffer, {
      limitInputPixels: 20_000_000,
      failOn: "error",
      animated: false,
    });
    const info = await decoder.metadata();
    if (!["jpeg", "png", "webp"].includes(info.format || ""))
      throw new AppError(
        "UNSUPPORTED_IMAGE",
        "Choose a JPG, PNG or WebP photograph.",
      );
    if (
      !info.width ||
      !info.height ||
      Math.min(info.width, info.height) < 32 ||
      (info.pages || 1) > 1
    )
      throw new AppError(
        "INVALID_IMAGE",
        "Choose a single photograph at least 32 pixels wide and tall.",
      );
    const { data, info: decoded } = await decoder
      .rotate()
      .removeAlpha()
      .toColourspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });
    return resizeRGB(data, decoded.width, decoded.height);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "INVALID_IMAGE",
      "This image could not be decoded. Use a JPG, PNG or WebP under 20 megapixels.",
    );
  }
}
