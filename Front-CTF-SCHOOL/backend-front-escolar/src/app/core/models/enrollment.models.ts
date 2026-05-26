export interface EnrollmentSummary {
  total: number;
  active: number;
  pending: number;
  courses: number;
}

export interface EnrollmentCourseOption {
  id: number;
  code: string;
  name: string;
  level: string;
  letter: string;
  schoolYear: number;
  scheduleType: string;
}

export interface EnrollmentListItem {
  id: number;
  studentId: number;
  studentRun: string;
  studentName: string;
  studentLastName: string;
  fullName: string;
  courseId: number;
  courseName: string;
  guardianFullName: string;
  status: string;
  enrollmentDate: string;
}

export interface EnrollmentGuardian {
  id: number | null;
  run: string;
  name: string;
  lastName: string;
  birthDate: string;
  address: string;
  phone: string;
  email: string;
  education: string;
  relation: string;
  authorizedPickup: boolean;
}

export interface EnrollmentFamilyContact {
  id: number | null;
  run: string;
  name: string;
  lastName: string;
  birthDate: string;
  address: string;
  phone: string;
  email: string;
  education: string;
}

export interface EnrollmentPickupContact {
  id: number | null;
  run: string;
  name: string;
  lastName: string;
  phone: string;
  relation: string;
  authorizedPickup: boolean;
}

export interface EnrollmentEstablishment {
  regionId: number | null;
  communeId: number | null;
  name: string;
  academicYear: string;
  dependency: string;
  region: string;
  commune: string;
  address: string;
}

export interface EnrollmentCourseSelection {
  baseName: string;
  level: string;
  letter: string;
  schoolYear: string;
  scheduleType: string;
}

export interface EnrollmentDocument {
  id: number | null;
  documentKey: string;
  fileName: string;
  driveFileId?: string | null;
  driveUrl?: string | null;
}

export interface EnrollmentStudentAccess {
  configureAccess: boolean;
  createStudentAccount: boolean;
  username: string;
  temporaryPassword: string;
  notifyByEmail: boolean;
  contactEmail: string;
  status: string;
}

export interface EnrollmentGuardianAccess {
  configureAccess: boolean;
  createGuardianAccount: boolean;
  username: string;
  temporaryPassword: string;
  notifyByEmail: boolean;
  contactEmail: string;
  status: string;
}

export interface EnrollmentDetail {
  id: number;
  studentId: number;
  studentRun: string;
  studentName: string;
  studentLastName: string;
  birthDate: string;
  gender: string;
  courseId: number;
  regionId: number | null;
  communeId: number | null;
  courseName: string;
  courseLevel: string;
  courseLetter: string;
  courseSchoolYear: number | null;
  courseScheduleType: string;
  address: string;
  livesWith: string;
  allergies: string;
  specialistDiagnoses: string;
  emergencyContact: string;
  specialNeeds: string;
  status: string;
  enrollmentDate: string;
  establishment: EnrollmentEstablishment;
  guardian: EnrollmentGuardian;
  father: EnrollmentFamilyContact;
  mother: EnrollmentFamilyContact;
  pickupContacts: EnrollmentPickupContact[];
  documents: EnrollmentDocument[];
  studentAccess: EnrollmentStudentAccess;
  guardianAccess: EnrollmentGuardianAccess;
}

export interface EnrollmentPagination {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface EnrollmentOverview {
  summary: EnrollmentSummary;
  courses: EnrollmentCourseOption[];
  enrollments: EnrollmentListItem[];
  pagination: EnrollmentPagination;
}

export interface EnrollmentPayload {
  studentRun: string;
  studentName: string;
  studentLastName: string;
  birthDate: string;
  gender: string;
  courseId: number;
  courseSelection: EnrollmentCourseSelection;
  regionId: number | null;
  communeId: number | null;
  address: string;
  livesWith: string;
  allergies: string;
  specialistDiagnoses: string;
  emergencyContact: string;
  specialNeeds: string;
  status: string;
  enrollmentDate: string;
  establishment: EnrollmentEstablishment;
  guardian: EnrollmentGuardian;
  father: EnrollmentFamilyContact;
  mother: EnrollmentFamilyContact;
  pickupContacts: EnrollmentPickupContact[];
  documents: EnrollmentDocument[];
  studentAccess: EnrollmentStudentAccess;
  guardianAccess: EnrollmentGuardianAccess;
}
