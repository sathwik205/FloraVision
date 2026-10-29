import data from "./catalog-data.json";
import type { Advisory, Crop, CropId } from "./types";
export const crops = data.crops as Crop[];
export const advice = data.advice as Record<string, Advisory>;
export const cropById = (id: string) => crops.find((crop) => crop.id === id);
export const displayName = (label: string) => {
  const name = label.split("___").pop()!.replaceAll("_", " ").trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
};
export const cropColors: Record<CropId, string> = {
  potato: "#ad895e",
  pepper: "#66975f",
  corn: "#c8a340",
  grape: "#9873a4",
  apple: "#ba6a5b",
  tomato: "#c96b50",
};
export const cropDescriptions: Record<CropId, string> = {
  potato: "Early blight, late blight & healthy leaves",
  pepper: "Bacterial spot & healthy leaves",
  corn: "Rust, leaf spots, blight & healthy leaves",
  grape: "Black rot, Esca, blight & healthy leaves",
  apple: "Scab, rot, rust & healthy leaves",
  tomato: "Ten categories, from blights to healthy leaves",
};
