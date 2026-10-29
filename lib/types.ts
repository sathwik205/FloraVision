export type CropId =
  "potato" | "pepper" | "corn" | "grape" | "apple" | "tomato";
export interface Crop {
  id: CropId;
  name: string;
  labels: string[];
  installed?: boolean;
}
export interface Advisory {
  display_name: string;
  symptoms: string;
  prevention: string[];
  next_step: string;
  review_status: string;
  revision: string;
  source: string;
}
export interface Assessment {
  id: string;
  crop: CropId;
  diseaseId: string;
  name: string;
  score: number;
  distribution: { label: string; name: string; score: number }[];
  advisory: Advisory | null;
  needsReview: boolean;
  modelVersion: string;
  durationMs: number | null;
  createdAt: string;
  demo: boolean;
  imageName: string;
  preprocessing: string;
}
export type View = "overview" | "scan" | "library" | "history" | "models";
