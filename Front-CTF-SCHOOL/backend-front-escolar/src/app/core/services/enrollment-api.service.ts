import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.config';
import { EnrollmentDetail, EnrollmentOverview, EnrollmentPayload } from '../models/enrollment.models';
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

  update(enrollmentId: number, payload: EnrollmentPayload): Observable<EnrollmentDetail> {
    return this.http.put<EnrollmentDetail>(`${API_CONFIG.baseUrl}/matriculas/${enrollmentId}`, payload).pipe(
      map((detail) => this.normalizeDetail(detail))
    );
  }

  delete(enrollmentId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/matriculas/${enrollmentId}`);
  }

  private normalizeOverview(overview: EnrollmentOverview): EnrollmentOverview {
    return {
      ...overview,
      courses: overview.courses.map((course) => ({
        ...course,
        code: normalizeDashboardText(course.code),
        name: normalizeDashboardText(course.name)
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
      address: normalizeDashboardText(detail.address),
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
        phone: normalizeDashboardText(detail.guardian.phone),
        email: normalizeDashboardText(detail.guardian.email),
        relation: normalizeDashboardText(detail.guardian.relation)
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
      }))
    };
  }
}
