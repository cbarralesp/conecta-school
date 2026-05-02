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
  schoolYear: number;
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
  phone: string;
  email: string;
  relation: string;
  authorizedPickup: boolean;
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

export interface EnrollmentDocument {
  id: number | null;
  documentKey: string;
  fileName: string;
  driveFileId?: string | null;
  driveUrl?: string | null;
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
  address: string;
  specialNeeds: string;
  status: string;
  enrollmentDate: string;
  establishment: EnrollmentEstablishment;
  guardian: EnrollmentGuardian;
  pickupContacts: EnrollmentPickupContact[];
  documents: EnrollmentDocument[];
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
  regionId: number | null;
  communeId: number | null;
  address: string;
  specialNeeds: string;
  status: string;
  enrollmentDate: string;
  establishment: EnrollmentEstablishment;
  guardian: EnrollmentGuardian;
  pickupContacts: EnrollmentPickupContact[];
  documents: EnrollmentDocument[];
}
