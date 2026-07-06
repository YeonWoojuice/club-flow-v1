export type GenerationStatus = "ACTIVE" | "CLOSED";

export type Generation = {
  id: string;
  clubId: string;
  name: string;
  status: GenerationStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  closedAt: string | null;
};

export type CreateGenerationInput = {
  name: string;
  startDate: string;
  endDate: string;
};

export type UpdateGenerationInput = CreateGenerationInput & {
  status: GenerationStatus;
};
