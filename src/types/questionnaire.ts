export type QuestionType = "text" | "multiple" | "scale" | "textarea" | "checkbox";

export interface Question {
  id: string;
  label: string;
  section: string;
  type: QuestionType;
  options?: string[]; // Per domande a risposta multipla
  scale?: { min: number; max: number; labels?: { min: string; max: string } }; // Per scale
  required?: boolean;
}

export interface Questionnaire {
  id: string;
  name: string;
  sector: string;
  createdAt: Date;
  createdBy: string;
  questions: Question[];
  isActive?: boolean; // Per marcare il questionario attivo di default
}

export interface QuestionnaireFormData {
  name: string;
  sector: string;
  questions: Question[];
}
