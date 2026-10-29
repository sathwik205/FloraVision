import { advice, displayName } from "@/lib/catalog";
import type { Assessment } from "@/lib/types";
export const dynamic = "force-dynamic";
export async function GET() {
  const labels = [
      "Potato___Early_blight",
      "Potato___Late_blight",
      "Potato___healthy",
    ],
    scores = [0.82, 0.12, 0.06];
  const assessment: Assessment = {
    id: "demo-potato",
    crop: "potato",
    diseaseId: labels[0],
    name: "Early blight",
    score: 0.82,
    distribution: labels.map((label, i) => ({
      label,
      name: displayName(label),
      score: scores[i],
    })),
    advisory: advice[labels[0]],
    needsReview: true,
    modelVersion: "Illustrative UI fixture",
    durationMs: null,
    createdAt: new Date().toISOString(),
    demo: true,
    imageName: "Illustrative leaf",
    preprocessing: "not-applicable",
  };
  return Response.json(
    { ok: true, assessment },
    { headers: { "Cache-Control": "no-store" } },
  );
}
