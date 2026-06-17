export interface SubjectAssignedTeacher {
  id: number;
  code: string;
  fullName: string;
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  area: string;
  colorHex: string;
  description: string;
  referenceLevel: string;
  evaluationType: 'NUMERICA' | 'CONCEPTUAL';
  displayLevel?: string;
  suggestedHours: number;
  active: boolean;
  assignedTeachers: SubjectAssignedTeacher[];
  applicableGradeIds: number[];
  applicableGradeNames: string[];
  applicableCourseIds: number[];
  applicableCourseNames: string[];
}

export interface SubjectPayload {
  code: string;
  name: string;
  area: string;
  colorHex: string;
  description: string;
  referenceLevel: string;
  evaluationType: 'NUMERICA' | 'CONCEPTUAL';
  suggestedHours: number;
  teacherIds: number[];
  applicableGradeIds: number[];
  applicableCourseIds: number[];
}
