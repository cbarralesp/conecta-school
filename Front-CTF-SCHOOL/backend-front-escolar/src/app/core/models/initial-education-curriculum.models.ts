export interface InitialEducationCurriculumActivity {
  number: number | null;
  description: string;
}

export interface InitialEducationCurriculumObjective {
  code: string;
  description: string;
  evaluationIndicators: string[];
  activities: InitialEducationCurriculumActivity[];
}

export interface InitialEducationCurriculumDetail {
  id: number;
  code: string;
  grade: string;
  visibleSubject: string;
  ambit: string;
  nucleus: string;
  totalObjectives: number | null;
  rawJson: string;
  objectives: InitialEducationCurriculumObjective[];
}
