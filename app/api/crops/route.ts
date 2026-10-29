import { crops } from "@/lib/catalog";
import { modelInstalled } from "@/lib/model-files";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(
    {
      ok: true,
      crops: await Promise.all(
        crops.map(async (crop) => ({
          ...crop,
          installed: await modelInstalled(crop.id),
        })),
      ),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
