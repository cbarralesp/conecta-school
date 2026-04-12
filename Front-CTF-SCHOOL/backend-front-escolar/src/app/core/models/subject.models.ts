export interface Subject {
  id: number;
  code: string;
  name: string;
  area: string;
  colorHex: string;
  description: string;
  referenceLevel: string;
  suggestedHours: number;
  active: boolean;
}

export interface SubjectPayload {
  code: string;
  name: string;
  area: string;
  colorHex: string;
  description: string;
  referenceLevel: string;
  suggestedHours: number;
}
