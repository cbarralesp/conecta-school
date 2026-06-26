export interface StudyProgramSummary {
  id: number;
  code: string;
  subject: string;
  grade: string;
  decree: string;
  source: string;
  edition: string;
  totalUnits: number | null;
  totalObjectives: number | null;
  totalHours: number | null;
}

export interface StudyProgramAttitude {
  code: string;
  description: string;
}

export interface StudyProgramObjectiveDetail {
  code: string;
  axis: string;
  description: string;
  subItems: string[];
  evaluationIndicators: string[];
  activities: Array<{
    number: number | null;
    title: string;
    description: string;
    teacherNote: string;
  }>;
}

export interface StudyProgramUnit {
  number: number | null;
  name: string;
  semester: number | null;
  estimatedHours: number | null;
  readingPurpose: string;
  writingPurpose: string;
  oralCommunicationPurpose: string;
  attitudes: StudyProgramAttitude[];
  suggestedReadings: Array<{
    category: string;
    title: string;
    author: string;
  }>;
  objectives: StudyProgramObjectiveDetail[];
  evaluationExamples: Array<{
    number: number | null;
    objectiveCode: string;
    evaluatedIndicators: string;
    activityDescription: string;
    evaluationCriteria: string;
  }>;
}

export interface StudyProgramDetail {
  id: number;
  code: string;
  subject: string;
  grade: string;
  decree: string;
  source: string;
  isbn: string;
  edition: string;
  totalUnits: number | null;
  totalObjectives: number | null;
  totalHours: number | null;
  permanentObjectivesDescription: string;
  rawJson: string;
  axes: string[];
  globalAttitudes: StudyProgramAttitude[];
  objectiveCatalog: Array<{
    code: string;
    axis: string;
    description: string;
    subItems: string[];
  }>;
  permanentObjectives: StudyProgramObjectiveDetail[];
  units: StudyProgramUnit[];
}
