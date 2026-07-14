import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.config';
import { EnrollmentApiService } from './enrollment-api.service';
import { EnrollmentDetail, EnrollmentListItem, EnrollmentOverview } from '../models/enrollment.models';
import {
  CreateStudentLifeInterviewPayload,
  CreateStudentLifeRecordPayload,
  StudentLifeInterview,
  StudentLifeRecord,
  StudentLifeAlert,
  StudentLifeListItem,
  StudentLifeOverview,
  StudentLifeStatus
} from '../models/student-life.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class StudentLifeApiService {
  private readonly http = inject(HttpClient);
  private readonly enrollmentApiService = inject(EnrollmentApiService);

  getOverview(filters?: {
    schoolYear?: number | null;
    search?: string;
    courseId?: number | null;
    status?: string | null;
    page?: number;
    size?: number;
  }): Observable<StudentLifeOverview> {
    return this.enrollmentApiService.getOverview(filters).pipe(
      switchMap((overview) => {
        if (overview.enrollments.length === 0) {
          return of(this.mapOverview(overview, new Map()));
        }

        return forkJoin(
          overview.enrollments.map((item) =>
            this.enrollmentApiService.getById(item.id).pipe(catchError(() => of(null)))
          )
        ).pipe(
          map((details) => {
            const detailsByEnrollmentId = new Map<number, EnrollmentDetail>();
            details.forEach((detail) => {
              if (detail) {
                detailsByEnrollmentId.set(detail.id, detail);
              }
            });
            return this.mapOverview(overview, detailsByEnrollmentId);
          })
        );
      })
    );
  }

  getInterviews(studentId: number): Observable<StudentLifeInterview[]> {
    return this.http
      .get<StudentLifeInterview[]>(`${API_CONFIG.baseUrl}/hoja-vida/estudiantes/${studentId}/entrevistas`)
      .pipe(map((interviews) => interviews.map((interview) => this.normalizeInterview(interview))));
  }

  getInterview(interviewId: number): Observable<StudentLifeInterview> {
    return this.http
      .get<StudentLifeInterview>(`${API_CONFIG.baseUrl}/hoja-vida/entrevistas/${interviewId}`)
      .pipe(map((interview) => this.normalizeInterview(interview)));
  }

  createInterview(payload: CreateStudentLifeInterviewPayload): Observable<StudentLifeInterview> {
    return this.http
      .post<StudentLifeInterview>(`${API_CONFIG.baseUrl}/hoja-vida/entrevistas`, payload)
      .pipe(map((interview) => this.normalizeInterview(interview)));
  }

  updateInterview(
    interviewId: number,
    payload: CreateStudentLifeInterviewPayload
  ): Observable<StudentLifeInterview> {
    return this.http
      .put<StudentLifeInterview>(`${API_CONFIG.baseUrl}/hoja-vida/entrevistas/${interviewId}`, payload)
      .pipe(map((interview) => this.normalizeInterview(interview)));
  }

  deleteInterview(interviewId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/hoja-vida/entrevistas/${interviewId}`);
  }

  downloadInterviewPdf(interviewId: number): Observable<Blob> {
    return this.http.get(`${API_CONFIG.baseUrl}/hoja-vida/entrevistas/${interviewId}/pdf`, {
      responseType: 'blob'
    });
  }

  getRecords(studentId: number): Observable<StudentLifeRecord[]> {
    return this.http
      .get<StudentLifeRecord[]>(`${API_CONFIG.baseUrl}/hoja-vida/estudiantes/${studentId}/convivencia`)
      .pipe(map((records) => records.map((record) => this.normalizeRecord(record))));
  }

  getRecord(recordId: number): Observable<StudentLifeRecord> {
    return this.http
      .get<StudentLifeRecord>(`${API_CONFIG.baseUrl}/hoja-vida/convivencia/${recordId}`)
      .pipe(map((record) => this.normalizeRecord(record)));
  }

  createRecord(payload: CreateStudentLifeRecordPayload): Observable<StudentLifeRecord> {
    return this.http
      .post<StudentLifeRecord>(`${API_CONFIG.baseUrl}/hoja-vida/convivencia`, payload)
      .pipe(map((record) => this.normalizeRecord(record)));
  }

  updateRecord(recordId: number, payload: CreateStudentLifeRecordPayload): Observable<StudentLifeRecord> {
    return this.http
      .put<StudentLifeRecord>(`${API_CONFIG.baseUrl}/hoja-vida/convivencia/${recordId}`, payload)
      .pipe(map((record) => this.normalizeRecord(record)));
  }

  deleteRecord(recordId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/hoja-vida/convivencia/${recordId}`);
  }

  private mapOverview(
    overview: EnrollmentOverview,
    detailsByEnrollmentId: Map<number, EnrollmentDetail>
  ): StudentLifeOverview {
    const students = overview.enrollments.map((item, index) =>
      this.mapStudent(item, detailsByEnrollmentId.get(item.id), index)
    );

    return {
      summary: {
        totalEstudiantes: overview.summary.total,
        conHojaActiva: overview.summary.active,
        enSeguimiento: overview.summary.pending,
        conAlertas: students.filter((student) => student.alertas.length > 0).length,
        entrevistasPendientes: 0,
        documentosPorRevisar: students.reduce((count, student) => count + (student.alertas.includes('PIE') ? 1 : 0), 0)
      },
      courses: overview.courses.map((course) => ({
        id: course.id,
        name: normalizeDashboardText(course.name),
        schoolYear: course.schoolYear
      })),
      students,
      pagination: {
        page: overview.pagination?.page ?? 0,
        size: overview.pagination?.size ?? students.length,
        totalItems: overview.pagination?.totalItems ?? overview.summary.total,
        totalPages: overview.pagination?.totalPages ?? (overview.summary.total > 0 ? 1 : 0)
      }
    };
  }

  private mapStudent(item: EnrollmentListItem, detail: EnrollmentDetail | undefined, index: number): StudentLifeListItem {
    return {
      id: item.id,
      studentId: item.studentId,
      nombre: normalizeDashboardText(item.fullName || `${item.studentName} ${item.studentLastName}`.trim()),
      run: normalizeDashboardText(item.studentRun),
      curso: normalizeDashboardText(item.courseName),
      courseId: item.courseId,
      courseSchoolYear: item.courseSchoolYear ?? detail?.courseSchoolYear ?? null,
      apoderado: normalizeDashboardText(item.guardianFullName || detail?.guardian?.name || ''),
      estado: this.mapStatus(item.status),
      alertas: this.mapAlerts(detail),
      avatarTone: this.avatarTone(index)
    };
  }

  private mapStatus(status: string): StudentLifeStatus {
    const normalized = normalizeDashboardText(status).trim().toUpperCase();
    if (['INACTIVO', 'INACTIVA'].includes(normalized)) {
      return 'Inactivo';
    }
    if (['PENDIENTE', 'SEGUIMIENTO'].includes(normalized)) {
      return 'Seguimiento';
    }
    return 'Activo';
  }

  private mapAlerts(detail: EnrollmentDetail | undefined): StudentLifeAlert[] {
    if (!detail) {
      return [];
    }

    const alerts = new Set<StudentLifeAlert>();
    const allergies = normalizeDashboardText(detail.allergies).trim();
    const diagnoses = normalizeDashboardText(detail.specialistDiagnoses).trim();
    const specialNeeds = normalizeDashboardText(detail.specialNeeds).trim();

    if (allergies) {
      alerts.add('Alergia');
    }
    if (diagnoses || specialNeeds) {
      alerts.add('PIE');
    }

    return Array.from(alerts);
  }

  private avatarTone(index: number): StudentLifeListItem['avatarTone'] {
    const tones: StudentLifeListItem['avatarTone'][] = ['blue', 'emerald', 'amber', 'violet', 'rose'];
    return tones[index % tones.length];
  }

  private normalizeInterview(interview: StudentLifeInterview): StudentLifeInterview {
    return {
      ...interview,
      type: (normalizeDashboardText(interview.type) || 'Apoderado') as StudentLifeInterview['type'],
      participants: (interview.participants ?? []).map((participant) => normalizeDashboardText(participant)),
      reason: normalizeDashboardText(interview.reason),
      responsible: normalizeDashboardText(interview.responsible),
      responsibleRole: normalizeDashboardText(interview.responsibleRole),
      status: (normalizeDashboardText(interview.status) || 'Realizada') as StudentLifeInterview['status'],
      summary: normalizeDashboardText(interview.summary),
      agreements: normalizeDashboardText(interview.agreements)
    };
  }

  private normalizeRecord(record: StudentLifeRecord): StudentLifeRecord {
    return {
      ...record,
      type: (normalizeDashboardText(record.type) || 'Positiva') as StudentLifeRecord['type'],
      category: normalizeDashboardText(record.category),
      area: normalizeDashboardText(record.area),
      responsible: normalizeDashboardText(record.responsible),
      status: normalizeDashboardText(record.status),
      deadline: normalizeDashboardText(record.deadline),
      description: normalizeDashboardText(record.description)
    };
  }
}
