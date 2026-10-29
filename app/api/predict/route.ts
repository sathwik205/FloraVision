import { randomUUID } from "node:crypto";
import { advice, cropById, displayName } from "@/lib/catalog";
import { AppError, errorResponse } from "@/lib/errors";
import { parseUpload, preprocessImage, MAX_IMAGE_BYTES } from "@/lib/image";
import { infer } from "@/lib/inference";
import type { Assessment, CropId } from "@/lib/types";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      throw new AppError(
        "INVALID_ORIGIN",
        "Use the upload form on this website.",
        403,
      );
    const start = performance.now(),
      form = await parseUpload(request),
      crop = form.get("crop");
    if (typeof crop !== "string" || !cropById(crop))
      throw new AppError(
        "INVALID_CROP",
        "Choose one of the six supported crops.",
      );
    const file = form.get("image");
    if (!file || typeof file === "string" || file.size === 0)
      throw new AppError("MISSING_IMAGE", "Choose a leaf photograph first.");
    if (file.size > MAX_IMAGE_BYTES)
      throw new AppError(
        "UPLOAD_TOO_LARGE",
        "Choose a photograph smaller than 4 MB.",
        413,
      );
    const pixels = await preprocessImage(Buffer.from(await file.arrayBuffer()));
    const { scores, meta } = await infer(crop, pixels),
      index = scores.indexOf(Math.max(...scores)),
      label = meta.labels[index],
      guidance = advice[label] || null;
    const configured = Number(process.env.REVIEW_THRESHOLD || ".70");
    const threshold =
      Number.isFinite(configured) && configured >= 0 && configured <= 1
        ? configured
        : 0.7;
    const assessment: Assessment = {
      id: randomUUID(),
      crop: crop as CropId,
      diseaseId: label,
      name: displayName(label),
      score: scores[index],
      distribution: meta.labels.map((label, i) => ({
        label,
        name: displayName(label),
        score: scores[i],
      })),
      advisory: guidance,
      needsReview: scores[index] < threshold || !guidance,
      modelVersion: meta.version,
      durationMs: Math.round(performance.now() - start),
      createdAt: new Date().toISOString(),
      demo: false,
      imageName: file.name.slice(0, 120),
      preprocessing: "rgb-bilinear-unit-v1",
    };
    return Response.json(
      { ok: true, assessment },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
