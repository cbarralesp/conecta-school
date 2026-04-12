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

export interface EnrollmentDetail {
  id: number;
  studentId: number;
  studentRun: string;
  studentName: string;
  studentLastName: string;
  birthDate: string;
  gender: string;
  courseId: number;
  courseName: string;
  address: string;
  specialNeeds: string;
  status: string;
  enrollmentDate: string;
  guardian: EnrollmentGuardian;
  pickupContacts: EnrollmentPickupContact[];
}

export interface EnrollmentOverview {
  summary: EnrollmentSummary;
  courses: EnrollmentCourseOption[];
  enrollments: EnrollmentListItem[];
}

export interface EnrollmentPayload {
  studentRun: string;
  studentName: string;
  studentLastName: string;
  birthDate: string;
  gender: string;
  courseId: number;
  address: string;
  specialNeeds: string;
  status: string;
  enrollmentDate: string;
  guardian: EnrollmentGuardian;
  pickupContacts: EnrollmentPickupContact[];
}
