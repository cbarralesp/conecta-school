import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.config';
import { formatCourseLevelLabel, formatScheduleLabel } from '../constants/course-levels';
import { EnrollmentAccessPreview, EnrollmentAccessPreviewPayload, EnrollmentDetail, EnrollmentDocument, EnrollmentOverview, EnrollmentPayload, EnrollmentRenewalPayload } from '../models/enrollment.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class EnrollmentApiService {
  private readonly schoolYears = [2025, 2026, 2027, 2028] as const;
  private readonly http = inject(HttpClient);

  getOverview(filters?: { schoolYear?: number | null; search?: string; courseId?: number | null; status?: string | null; page?: number; size?: number }): Observable<EnrollmentOverview> {
    let params = new HttpParams();
    const schoolYear = typeof filters?.schoolYear === 'number' ? filters.schoolYear : this.defaultSchoolYear();
    if (typeof schoolYear === 'number') {
      params = params.set('schoolYear', schoolYear);
    }
    if (filters?.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters?.courseId) {
      params = params.set('courseId', filters.courseId);
    }
    if (filters?.status?.trim()) {
      params = params.set('status', filters.status.trim());
    }
    if (typeof filters?.page === 'number') {
      params = params.set('page', filters.page);
    }
    if (typeof filters?.size === 'number') {
      params = params.set('size', filters.size);
    }

    return this.http.get<EnrollmentOverview>(`${API_CONFIG.baseUrl}/matriculas`, { params }).pipe(
      map((overview) => this.normalizeOverview(overview, schoolYear))
    );
  }

  getById(enrollmentId: number): Observable<EnrollmentDetail> {
    return this.http.get<EnrollmentDetail>(`${API_CONFIG.baseUrl}/matriculas/${enrollmentId}`).pipe(
      map((detail) => this.normalizeDetail(detail))
    );
  }

  create(payload: EnrollmentPayload): Observable<EnrollmentDetail> {
    return this.http.post<EnrollmentDetail>(`${API_CONFIG.baseUrl}/matriculas`, payload).pipe(
      map((detail) => this.normalizeDetail(detail))
    );
  }

  previewAccess(payload: EnrollmentAccessPreviewPayload): Observable<EnrollmentAccessPreview> {
    return this.http.post<EnrollmentAccessPreview>(`${API_CONFIG.baseUrl}/matriculas/access-preview`, payload).pipe(
      map((preview) => ({
        studentUsername: normalizeDashboardText(preview.studentUsername ?? ''),
        guardianUsername: normalizeDashboardText(preview.guardianUsername ?? '')
      }))
    );
  }

  update(enrollmentId: number, payload: EnrollmentPayload): Observable<EnrollmentDetail> {
    return this.http.put<EnrollmentDetail>(`${API_CONFIG.baseUrl}/matriculas/${enrollmentId}`, payload).pipe(
      map((detail) => this.normalizeDetail(detail))
    );
  }

  renew(enrollmentId: number, payload: EnrollmentRenewalPayload): Observable<EnrollmentDetail> {
    return this.http.post<EnrollmentDetail>(`${API_CONFIG.baseUrl}/matriculas/${enrollmentId}/renovar`, payload).pipe(
      map((detail) => this.normalizeDetail(detail))
    );
  }

  delete(enrollmentId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/matriculas/${enrollmentId}`);
  }

  reactivate(enrollmentId: number): Observable<EnrollmentDetail> {
    return this.http.post<EnrollmentDetail>(`${API_CONFIG.baseUrl}/matriculas/${enrollmentId}/reactivar`, {}).pipe(
      map((detail) => this.normalizeDetail(detail))
    );
  }

  uploadDocument(enrollmentId: number, documentKey: string, file: File): Observable<EnrollmentDocument> {
    const formData = new FormData();
    formData.append('documentKey', documentKey);
    formData.append('file', file, file.name);
    return this.http.post<EnrollmentDocument>(`${API_CONFIG.baseUrl}/matriculas/${enrollmentId}/documentos`, formData).pipe(
      map((document) => ({
        ...document,
        fileName: normalizeDashboardText(document.fileName ?? ''),
        storageProvider: normalizeDashboardText(document.storageProvider ?? ''),
        storageKey: normalizeDashboardText(document.storageKey ?? ''),
        driveFileId: normalizeDashboardText(document.driveFileId ?? ''),
        driveUrl: normalizeDashboardText(document.driveUrl ?? ''),
        mimeType: normalizeDashboardText(document.mimeType ?? '')
      }))
    );
  }

  uploadStudentPhoto(enrollmentId: number, file: File): Observable<EnrollmentDetail> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<EnrollmentDetail>(`${API_CONFIG.baseUrl}/matriculas/${enrollmentId}/foto`, formData).pipe(
      map((detail) => this.normalizeDetail(detail))
    );
  }

  studentPhotoUrl(enrollmentId: number): string {
    return `${API_CONFIG.baseUrl}/matriculas/${enrollmentId}/foto`;
  }

  documentPreviewUrl(enrollmentId: number, documentId: number): string {
    return `${API_CONFIG.baseUrl}/matriculas/${enrollmentId}/documentos/${documentId}/download`;
  }

  downloadDocumentBlob(enrollmentId: number, documentId: number): Observable<Blob> {
    return this.http.get(this.documentPreviewUrl(enrollmentId, documentId), { responseType: 'blob' });
  }

  private defaultSchoolYear(): number {
    const currentYear = new Date().getFullYear();
    return this.schoolYears.includes(currentYear as typeof this.schoolYears[number])
      ? currentYear
      : this.schoolYears[0];
  }

  private normalizeOverview(overview: EnrollmentOverview, schoolYear: number | null): EnrollmentOverview {
    const filteredCourses = this.filterCoursesBySchoolYear(overview.courses, schoolYear);
    const filteredEnrollments = this.filterEnrollmentsBySchoolYear(
      overview.enrollments,
      overview.courses,
      schoolYear
    );
    const shouldUseClientFilteredData = schoolYear != null && filteredEnrollments.length !== overview.enrollments.length;

    return {
      ...overview,
      summary: shouldUseClientFilteredData
        ? {
          total: filteredEnrollments.length,
          active: filteredEnrollments.filter((enrollment) => normalizeDashboardText(enrollment.status).toUpperCase() === 'ACTIVO').length,
          pending: filteredEnrollments.filter((enrollment) => normalizeDashboardText(enrollment.status).toUpperCase() === 'PENDIENTE').length,
          courses: new Set(filteredEnrollments.map((enrollment) => enrollment.courseId)).size
        }
        : overview.summary,
      courses: filteredCourses.map((course) => ({
        ...course,
        code: normalizeDashboardText(course.code),
        name: normalizeDashboardText(course.name),
        level: formatCourseLevelLabel(normalizeDashboardText(course.level)),
        letter: normalizeDashboardText(course.letter),
        scheduleType: formatScheduleLabel(normalizeDashboardText(course.scheduleType))
      })),
      pagination: {
        page: overview.pagination?.page ?? 0,
        size: shouldUseClientFilteredData ? filteredEnrollments.length : overview.pagination?.size ?? overview.enrollments.length,
        totalItems: shouldUseClientFilteredData ? filteredEnrollments.length : overview.pagination?.totalItems ?? overview.summary.total,
        totalPages: shouldUseClientFilteredData
          ? (filteredEnrollments.length > 0 ? 1 : 0)
          : overview.pagination?.totalPages ?? (overview.summary.total > 0 ? 1 : 0)
      },
      enrollments: filteredEnrollments.map((enrollment) => ({
        ...enrollment,
        studentRun: normalizeDashboardText(enrollment.studentRun),
        studentName: normalizeDashboardText(enrollment.studentName),
        studentLastName: normalizeDashboardText(enrollment.studentLastName),
        fullName: normalizeDashboardText(enrollment.fullName),
        courseName: normalizeDashboardText(enrollment.courseName),
        guardianFullName: normalizeDashboardText(enrollment.guardianFullName),
        status: normalizeDashboardText(enrollment.status)
      }))
    };
  }

  private filterCoursesBySchoolYear(courses: EnrollmentOverview['courses'], schoolYear: number | null): EnrollmentOverview['courses'] {
    if (schoolYear == null) {
      return courses;
    }

    return courses.filter((course) => course.schoolYear === schoolYear);
  }

  private filterEnrollmentsBySchoolYear(
    enrollments: EnrollmentOverview['enrollments'],
    courses: EnrollmentOverview['courses'],
    schoolYear: number | null
  ): EnrollmentOverview['enrollments'] {
    if (schoolYear == null) {
      return enrollments;
    }

    const yearsByCourseId = new Map(courses.map((course) => [course.id, course.schoolYear]));
    return enrollments.filter((enrollment) => {
      const enrollmentSchoolYear = enrollment.courseSchoolYear ?? yearsByCourseId.get(enrollment.courseId);
      return enrollmentSchoolYear === schoolYear;
    });
  }

  private normalizeDetail(detail: EnrollmentDetail): EnrollmentDetail {
    return {
      ...detail,
      studentRun: normalizeDashboardText(detail.studentRun),
      studentName: normalizeDashboardText(detail.studentName),
      studentLastName: normalizeDashboardText(detail.studentLastName),
      gender: normalizeDashboardText(detail.gender),
      studentPhotoUrl: detail.studentPhotoUrl ? this.studentPhotoUrl(detail.id) : '',
      studentPhotoMimeType: normalizeDashboardText(detail.studentPhotoMimeType ?? ''),
      courseName: normalizeDashboardText(detail.courseName),
      courseLevel: normalizeDashboardText(detail.courseLevel ?? ''),
      courseLetter: normalizeDashboardText(detail.courseLetter ?? ''),
      courseSchoolYear: detail.courseSchoolYear ?? null,
      courseScheduleType: normalizeDashboardText(detail.courseScheduleType ?? ''),
      address: normalizeDashboardText(detail.address),
      livesWith: normalizeDashboardText(detail.livesWith ?? ''),
      allergies: normalizeDashboardText(detail.allergies ?? ''),
      specialistDiagnoses: normalizeDashboardText(detail.specialistDiagnoses ?? ''),
      emergencyContact: normalizeDashboardText(detail.emergencyContact ?? ''),
      specialNeeds: normalizeDashboardText(detail.specialNeeds),
      status: normalizeDashboardText(detail.status),
      establishment: {
        regionId: detail.establishment.regionId ?? null,
        communeId: detail.establishment.communeId ?? null,
        name: normalizeDashboardText(detail.establishment.name),
        academicYear: normalizeDashboardText(detail.establishment.academicYear),
        dependency: normalizeDashboardText(detail.establishment.dependency),
        region: normalizeDashboardText(detail.establishment.region),
        commune: normalizeDashboardText(detail.establishment.commune),
        address: normalizeDashboardText(detail.establishment.address)
      },
      guardian: {
        ...detail.guardian,
        run: normalizeDashboardText(detail.guardian.run),
        name: normalizeDashboardText(detail.guardian.name),
        lastName: normalizeDashboardText(detail.guardian.lastName),
        birthDate: normalizeDashboardText(detail.guardian.birthDate),
        address: normalizeDashboardText(detail.guardian.address),
        phone: normalizeDashboardText(detail.guardian.phone),
        email: normalizeDashboardText(detail.guardian.email),
        education: normalizeDashboardText(detail.guardian.education),
        relation: normalizeDashboardText(detail.guardian.relation)
      },
      father: {
        ...detail.father,
        run: normalizeDashboardText(detail.father?.run ?? ''),
        name: normalizeDashboardText(detail.father?.name ?? ''),
        lastName: normalizeDashboardText(detail.father?.lastName ?? ''),
        birthDate: normalizeDashboardText(detail.father?.birthDate ?? ''),
        address: normalizeDashboardText(detail.father?.address ?? ''),
        phone: normalizeDashboardText(detail.father?.phone ?? ''),
        email: normalizeDashboardText(detail.father?.email ?? ''),
        education: normalizeDashboardText(detail.father?.education ?? '')
      },
      mother: {
        ...detail.mother,
        run: normalizeDashboardText(detail.mother?.run ?? ''),
        name: normalizeDashboardText(detail.mother?.name ?? ''),
        lastName: normalizeDashboardText(detail.mother?.lastName ?? ''),
        birthDate: normalizeDashboardText(detail.mother?.birthDate ?? ''),
        address: normalizeDashboardText(detail.mother?.address ?? ''),
        phone: normalizeDashboardText(detail.mother?.phone ?? ''),
        email: normalizeDashboardText(detail.mother?.email ?? ''),
        education: normalizeDashboardText(detail.mother?.education ?? '')
      },
      pickupContacts: detail.pickupContacts.map((contact) => ({
        ...contact,
        run: normalizeDashboardText(contact.run),
        name: normalizeDashboardText(contact.name),
        lastName: normalizeDashboardText(contact.lastName),
        phone: normalizeDashboardText(contact.phone),
        relation: normalizeDashboardText(contact.relation)
      })),
      documents: detail.documents.map((document) => ({
        ...document,
        documentKey: normalizeDashboardText(document.documentKey),
        fileName: normalizeDashboardText(document.fileName),
        storageProvider: normalizeDashboardText(document.storageProvider ?? ''),
        storageKey: normalizeDashboardText(document.storageKey ?? ''),
        driveFileId: normalizeDashboardText(document.driveFileId ?? ''),
        driveUrl: normalizeDashboardText(document.driveUrl ?? ''),
        mimeType: normalizeDashboardText(document.mimeType ?? '')
      })),
      studentAccess: {
        configureAccess: !!detail.studentAccess?.configureAccess,
        createStudentAccount: !!detail.studentAccess?.createStudentAccount,
        username: normalizeDashboardText(detail.studentAccess?.username ?? ''),
        temporaryPassword: normalizeDashboardText(detail.studentAccess?.temporaryPassword ?? ''),
        notifyByEmail: !!detail.studentAccess?.notifyByEmail,
        contactEmail: normalizeDashboardText(detail.studentAccess?.contactEmail ?? ''),
        status: normalizeDashboardText(detail.studentAccess?.status ?? '')
      },
      guardianAccess: {
        configureAccess: !!detail.guardianAccess?.configureAccess,
        createGuardianAccount: !!detail.guardianAccess?.createGuardianAccount,
        username: normalizeDashboardText(detail.guardianAccess?.username ?? ''),
        temporaryPassword: normalizeDashboardText(detail.guardianAccess?.temporaryPassword ?? ''),
        notifyByEmail: !!detail.guardianAccess?.notifyByEmail,
        contactEmail: normalizeDashboardText(detail.guardianAccess?.contactEmail ?? ''),
        status: normalizeDashboardText(detail.guardianAccess?.status ?? '')
      }
    };
  }
}
