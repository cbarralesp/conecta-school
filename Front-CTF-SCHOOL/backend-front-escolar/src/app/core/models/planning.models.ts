export interface PlanningOptionItem {
  code: string;
  label: string;
}

export interface PlanningUnitCatalogAssignment {
  loadId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  subjectColorHex: string;
  courseId: number;
  courseCode: string;
  courseName: string;
  schoolYear: number;
  homeroomTeacher: boolean;
}

export interface PlanningUnitCatalogs {
  teachingAssignments: PlanningUnitCatalogAssignment[];
  unitNumbers: PlanningOptionItem[];
  weekOptions: PlanningOptionItem[];
}

export interface PlanningUnitPayload {
  subjectId: number;
  courseId: number;
  unitNumber: string;
  name: string;
  startWeek: number | null;
  startDate: string;
  endDate: string;
  estimatedWeeks: number;
  plannedClasses: number;
  generalDescription: string;
  learningObjectives: string;
  achievementIndicators: string;
}

export interface PlanningUnit {
  id: number;
  loadId: number;
  subjectId: number;
  subjectName: string;
  courseId: number;
  courseName: string;
  unitNumber: string;
  unitNumberLabel: string;
  name: string;
  startWeek: number | null;
  startDate: string;
  endDate: string;
  estimatedWeeks: number;
  plannedClasses: number;
  generalDescription: string;
  learningObjectives: string;
  achievementIndicators: string;
  status: 'BORRADOR' | 'CREADA' | 'ACTIVA' | 'COMPLETADA';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanningUnitSummary {
  id: number;
  unitNumberLabel: string;
  name: string;
  subjectName: string;
  courseName: string;
  status: 'BORRADOR' | 'CREADA' | 'ACTIVA' | 'COMPLETADA';
  startDate: string;
  endDate: string;
}

export interface PlanningClassCatalogUnit {
  unitId: number;
  unitNumberLabel: string;
  unitName: string;
  learningObjectives: string;
  subjectId: number;
  subjectName: string;
  courseId: number;
  courseName: string;
  status: string;
}

export interface PlanningObjectiveOption {
  code: string;
  label: string;
  description: string;
  unitId: number;
  axis: string;
  skills: string[];
  attitudes: string[];
}

export interface PlanningClassCatalogs {
  units: PlanningClassCatalogUnit[];
  objectives: PlanningObjectiveOption[];
  evaluationTypes: PlanningOptionItem[];
  durationOptions: PlanningOptionItem[];
}

export interface PlanningClassPayload {
  unitId: number;
  durationCode: string;
  plannedDate: string;
  title: string;
  objectiveCode: string;
  evaluationType: string;
  objectiveDescription: string;
  startActivity: string;
  developmentActivity: string;
  closingActivity: string;
}

export interface PlanningClassDocument {
  id: number;
  classId: number;
  originalName: string;
  storedName: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  filePath: string;
  fileType: PlanningDocumentFileType;
  visibleToStudents: boolean;
  uploadedAt: string;
}

export interface PlanningClass {
  id: number;
  unitId: number;
  subjectId: number;
  subjectName: string;
  courseId: number;
  courseName: string;
  unitNumberLabel: string;
  unitName: string;
  title: string;
  plannedDate: string;
  durationCode: string;
  durationLabel: string;
  objectiveCode: string;
  objectiveTitle: string;
  objectiveDescription: string;
  evaluationType: 'FORMATIVA' | 'SUMATIVA' | 'DIAGNOSTICA' | 'SIN_EVALUACION';
  startActivity: string;
  developmentActivity: string;
  closingActivity: string;
  status: 'BORRADOR' | 'PUBLICADA';
  publishedToStudents: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  documents: PlanningClassDocument[];
}

export type PlanningDocumentFileType = 'WORD' | 'PDF' | 'PPT' | 'OTRO';
export type PlanningDocumentOrigin = 'UNIDAD' | 'CLASE';

export interface PlanningDocument {
  id: number;
  unitId: number | null;
  classId: number | null;
  originalName: string;
  storedName: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  fileType: PlanningDocumentFileType;
  origin: PlanningDocumentOrigin;
  visibleToStudents: boolean;
  uploadedAt: string;
  subjectId: number | null;
  subjectName: string;
  courseName: string;
  unitNumberLabel: string;
  unitName: string;
  classTitle: string;
  createdBy: string;
}

export interface PlanningDocumentFilters {
  type?: PlanningDocumentFileType;
  unitId?: number;
  classId?: number;
  subjectId?: number;
  visibleToStudents?: boolean;
}

export interface DocumentItem {
  id: number;
  unitId: number | null;
  classId: number | null;
  name: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  type: PlanningDocumentFileType;
  origin: PlanningDocumentOrigin;
  uploadedAt: string;
  subjectId: number | null;
  subjectName: string;
  courseName: string;
  unitNumberLabel: string;
  unitName: string;
  classTitle: string;
  createdBy: string;
  visibleToStudents: boolean;
  visibilityLabel: string;
  freshnessLabel: string;
}

export interface UnitGroup {
  id: string;
  unitId: number | null;
  unitCode: string;
  unitName: string;
  courseName: string;
  totalDocuments: number;
  visibleDocuments: number;
  progressPercent: number;
  documents: DocumentItem[];
}

export interface SubjectGroup {
  id: string;
  subjectId: number | null;
  subjectName: string;
  semesterLabel: string;
  totalUnits: number;
  totalDocuments: number;
  visibleDocuments: number;
  teacherOnlyDocuments: number;
  units: UnitGroup[];
}

export interface PlanningDocumentTree {
  subjects: SubjectGroup[];
}

export interface PlanningSummaryMetrics {
  totalUnits: number;
  totalClasses: number;
  publishedClasses: number;
  totalDocuments: number;
  visibleDocuments: number;
  semesterProgressPercent: number;
}

export interface PlanningSubjectFilter {
  id: number;
  name: string;
}

export type PlanningSummaryStatus = 'PENDIENTE' | 'ACTIVA' | 'COMPLETADA';

export interface PlanningSummaryUnit {
  id: number;
  code: string;
  name: string;
  subjectId: number;
  subjectName: string;
  courseName: string;
  plannedClasses: number;
  totalClasses: number;
  publishedClasses: number;
  totalDocuments: number;
  weekRange: string;
  progressPercent: number;
  status: PlanningSummaryStatus;
}

export interface PlanningSummary {
  summary: PlanningSummaryMetrics;
  subjects: PlanningSubjectFilter[];
  units: PlanningSummaryUnit[];
}

export interface PlanningSummaryFilters {
  subjectId?: number;
  year?: number;
  courseId?: number;
  semester?: number;
  month?: number;
  status?: PlanningClass['status'];
  documentType?: PlanningDocumentFileType;
}
