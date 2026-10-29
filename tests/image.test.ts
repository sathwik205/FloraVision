import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { resizeRGB, preprocessImage, parseUpload } from "../lib/image";
for (const [w, h] of [
  [47, 61],
  [257, 193],
])
  test(`resize ${w}×${h} matches Pillow RGB bilinear pixel-for-pixel`, async () => {
    const folder = path.join(process.cwd(), "tests/fixtures");
    const raw = await fs.readFile(path.join(folder, `${w}x${h}.rgb`)),
      expected = await fs.readFile(path.join(folder, `${w}x${h}-expected.rgb`));
    const actual = resizeRGB(raw, w, h);
    assert.equal(actual.length, 128 * 128 * 3);
    for (let i = 0; i < actual.length; i++)
      assert.equal(
        Math.round(actual[i] * 255),
        expected[i],
        `Pixel channel ${i}`,
      );
  });
test("valid PNG content is decoded to RGB tensor", async () => {
  const image = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: { r: 255, g: 128, b: 0 },
    },
  })
    .png()
    .toBuffer();
  const tensor = await preprocessImage(image);
  assert.equal(tensor[0], 1);
  assert.ok(Math.abs(tensor[1] - 128 / 255) < 1e-7);
  assert.equal(tensor[2], 0);
});
test("invalid and small images are rejected", async () => {
  await assert.rejects(
    () => preprocessImage(Buffer.from("bad image")),
    /decoded/,
  );
  const small = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
  await assert.rejects(() => preprocessImage(small), /32 pixels/);
});
test("body limit is enforced even without content-length", async () => {
  const request = new Request("http://localhost/api/predict", {
    method: "POST",
    headers: { "content-type": "multipart/form-data; boundary=x" },
    body: Buffer.alloc(4_250_001),
  });
  await assert.rejects(() => parseUpload(request), /smaller than 4 MB/);
});
test("non-multipart requests are rejected", async () => {
  await assert.rejects(
    () =>
      parseUpload(
        new Request("http://localhost/api/predict", {
          method: "POST",
          body: "bad",
        }),
      ),
    /multipart/,
  );
});
