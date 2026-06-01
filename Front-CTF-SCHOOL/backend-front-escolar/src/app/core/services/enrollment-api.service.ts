import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.config';
import { formatCourseLevelLabel, formatScheduleLabel } from '../constants/course-levels';
import { EnrollmentAccessPreview, EnrollmentAccessPreviewPayload, EnrollmentDetail, EnrollmentOverview, EnrollmentPayload } from '../models/enrollment.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class EnrollmentApiService {
  private readonly http = inject(HttpClient);

  getOverview(filters?: { search?: string; courseId?: number | null; status?: string | null; page?: number; size?: number }): Observable<EnrollmentOverview> {
    let params = new HttpParams();
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
      map((overview) => this.normalizeOverview(overview))
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

  delete(enrollmentId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/matriculas/${enrollmentId}`);
  }

  reactivate(enrollmentId: number): Observable<EnrollmentDetail> {
    return this.http.post<EnrollmentDetail>(`${API_CONFIG.baseUrl}/matriculas/${enrollmentId}/reactivar`, {}).pipe(
      map((detail) => this.normalizeDetail(detail))
    );
  }

  private normalizeOverview(overview: EnrollmentOverview): EnrollmentOverview {
    return {
      ...overview,
      courses: overview.courses.map((course) => ({
        ...course,
        code: normalizeDashboardText(course.code),
        name: normalizeDashboardText(course.name),
        level: formatCourseLevelLabel(normalizeDashboardText(course.level)),
        letter: normalizeDashboardText(course.letter),
        scheduleType: formatScheduleLabel(normalizeDashboardText(course.scheduleType))
      })),
      pagination: {
        page: overview.pagination?.page ?? 0,
        size: overview.pagination?.size ?? overview.enrollments.length,
        totalItems: overview.pagination?.totalItems ?? overview.summary.total,
        totalPages: overview.pagination?.totalPages ?? (overview.summary.total > 0 ? 1 : 0)
      },
      enrollments: overview.enrollments.map((enrollment) => ({
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

  private normalizeDetail(detail: EnrollmentDetail): EnrollmentDetail {
    return {
      ...detail,
      studentRun: normalizeDashboardText(detail.studentRun),
      studentName: normalizeDashboardText(detail.studentName),
      studentLastName: normalizeDashboardText(detail.studentLastName),
      gender: normalizeDashboardText(detail.gender),
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
        driveFileId: normalizeDashboardText(document.driveFileId ?? ''),
        driveUrl: normalizeDashboardText(document.driveUrl ?? '')
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
