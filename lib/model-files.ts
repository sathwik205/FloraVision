import fs from "node:fs/promises";
import path from "node:path";
import { cropById } from "./catalog";
const modelRoot = () =>
  process.env.MODEL_DIR || path.join(process.cwd(), "models");
export const modelPath = (crop: string) =>
  path.join(modelRoot(), `${crop}-browser.json`);
export async function modelInstalled(crop: string) {
  if (!cropById(crop)) return false;
  try {
    const stat = await fs.stat(modelPath(crop));
    return stat.isFile() && stat.size > 0 && stat.size <= 25 * 1024 * 1024;
  } catch {
    return false;
  }
}
