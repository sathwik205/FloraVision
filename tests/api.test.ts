import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { POST } from "../app/api/predict/route";
import { GET as getDemo } from "../app/api/demo/route";
import { GET as getCrops } from "../app/api/crops/route";
import { fixtureModel } from "./fixture-model";
async function image() {
  return sharp({
    create: { width: 64, height: 64, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
}
function request(crop: string, bytes?: Uint8Array, origin?: string) {
  const form = new FormData();
  form.set("crop", crop);
  if (bytes)
    form.set(
      "image",
      new File([new Uint8Array(bytes)], "leaf.png", { type: "image/png" }),
    );
  return new Request("http://localhost:3000/api/predict", {
    method: "POST",
    body: form,
    headers: origin ? { origin } : undefined,
  });
}
test("API validates inputs and returns real inference with correctly mapped advice", async () => {
  const folder = await fs.mkdtemp(path.join(process.cwd(), "tests/model-tmp-"));
  process.env.MODEL_DIR = folder;
  try {
    assert.equal((await POST(request("../potato"))).status, 400);
    assert.equal((await POST(request("potato"))).status, 400);
    assert.equal(
      (await POST(request("potato", Buffer.from("bad")))).status,
      400,
    );
    assert.equal(
      (await POST(request("potato", await image(), "https://other.example")))
        .status,
      403,
    );
    const missing = await POST(request("potato", await image()));
    assert.equal(missing.status, 503);
    assert.equal((await missing.json()).error.code, "MODEL_MISSING");
    const crops = (await (await getCrops()).json()).crops;
    assert.equal(crops.length, 6);
    assert.ok(crops.every((c: { installed: boolean }) => !c.installed));
    await fs.writeFile(
      path.join(folder, "potato-browser.json"),
      JSON.stringify(fixtureModel()),
    );
    const response = await POST(request("potato", await image()));
    assert.equal(response.status, 200);
    const { assessment } = await response.json();
    assert.equal(assessment.demo, false);
    assert.equal(assessment.modelVersion, "SYNTHETIC-TEST-ONLY");
    assert.equal(assessment.name, "Early blight");
    assert.match(assessment.advisory.symptoms, /concentric/);
    assert.equal(assessment.distribution.length, 3);
  } finally {
    delete process.env.MODEL_DIR;
    await fs.rm(folder, { recursive: true, force: true });
  }
});
test("demo remains explicitly separate from inference", async () => {
  const response = await getDemo();
  const { assessment } = await response.json();
  assert.equal(assessment.demo, true);
  assert.equal(assessment.durationMs, null);
  assert.match(assessment.modelVersion, /fixture/);
});
