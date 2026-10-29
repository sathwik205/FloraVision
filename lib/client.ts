import type { Assessment } from "./types";
export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function readHistory(): Assessment[] {
  try {
    const value = JSON.parse(
      localStorage.getItem("floravision-history-v1") || "[]",
    );
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item: Assessment) =>
          item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.score === "number" &&
          Array.isArray(item.distribution) &&
          ["potato", "pepper", "corn", "grape", "apple", "tomato"].includes(
            item.crop,
          ),
      )
      .slice(0, 100);
  } catch {
    return [];
  }
}
export function persistHistory(items: Assessment[]) {
  localStorage.setItem(
    "floravision-history-v1",
    JSON.stringify(items.slice(0, 100)),
  );
}
export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}
export async function preparePhoto(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a JPG, PNG or WebP photograph. For HEIC photos, use the live camera or export a JPEG first.",
    );
  if (file.size > 20_000_000)
    throw new Error("Choose a photograph under 20 MB.");
  if (file.size <= 4_000_000) return file;
  let image: ImageBitmap | HTMLImageElement;
  let temporaryURL: string | null = null;
  if (typeof createImageBitmap === "function") {
    image = await createImageBitmap(file);
  } else {
    temporaryURL = URL.createObjectURL(file);
    const element = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        element.onload = () => resolve();
        element.onerror = () =>
          reject(new Error("Could not decode this photograph."));
        element.src = temporaryURL!;
      });
      image = element;
    } catch (error) {
      URL.revokeObjectURL(temporaryURL);
      throw error;
    }
  }
  try {
    if (image.width * image.height > 20_000_000)
      throw new Error("Choose a photograph under 20 megapixels.");
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Photo processing is unavailable in this browser.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88),
    );
    if (!blob || blob.size > 4_000_000)
      throw new Error("This photo is too large. Choose a smaller photograph.");
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } finally {
    if ("close" in image) image.close();
    if (temporaryURL) URL.revokeObjectURL(temporaryURL);
  }
}
