export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(
    { ok: true, service: "FloraVision", version: "1.0.0" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
