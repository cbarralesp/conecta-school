import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../constants/api.config';
import {
  GradeBookView,
  GradeCatalog,
  GradeEvaluationPayload,
  GradeReportView,
  SaveGradeBookPayload,
  StudentGradeProfileView
} from '../models/grade.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class GradeApiService {
  private readonly http = inject(HttpClient);

  getCatalog(): Observable<GradeCatalog> {
    return this.http
      .get<GradeCatalog>(`${API_CONFIG.baseUrl}/calificaciones/catalogo`)
      .pipe(
        map((catalog) => ({
          courses: catalog.courses.map((course) => ({
            ...course,
            name: normalizeDashboardText(course.name)
          })),
          periods: catalog.periods.map((period) => ({
            ...period,
            name: normalizeDashboardText(period.name)
          }))
        }))
      );
  }

  getGradeBook(courseId: number, periodId: number, subjectId?: number | null): Observable<GradeBookView> {
    const params: Record<string, string | number> = { courseId, periodId };
    if (subjectId != null) {
      params['subjectId'] = subjectId;
    }

    return this.http
      .get<GradeBookView>(`${API_CONFIG.baseUrl}/calificaciones/libro`, { params })
      .pipe(map((view) => this.normalizeGradeBook(view)));
  }

  saveGradeBook(payload: SaveGradeBookPayload): Observable<GradeBookView> {
    return this.http
      .put<GradeBookView>(`${API_CONFIG.baseUrl}/calificaciones/libro`, payload)
      .pipe(map((view) => this.normalizeGradeBook(view)));
  }

  createEvaluation(payload: GradeEvaluationPayload): Observable<GradeBookView> {
    return this.http
      .post<GradeBookView>(`${API_CONFIG.baseUrl}/calificaciones/evaluaciones`, payload)
      .pipe(map((view) => this.normalizeGradeBook(view)));
  }

  updateEvaluation(evaluationId: number, payload: GradeEvaluationPayload): Observable<GradeBookView> {
    return this.http
      .put<GradeBookView>(`${API_CONFIG.baseUrl}/calificaciones/evaluaciones/${evaluationId}`, payload)
      .pipe(map((view) => this.normalizeGradeBook(view)));
  }

  deleteEvaluation(evaluationId: number, courseId: number, periodId: number, subjectId: number): Observable<GradeBookView> {
    return this.http
      .delete<GradeBookView>(`${API_CONFIG.baseUrl}/calificaciones/evaluaciones/${evaluationId}`, {
        params: { courseId, periodId, subjectId }
      })
      .pipe(map((view) => this.normalizeGradeBook(view)));
  }

  getStudentProfile(courseId: number, periodId: number): Observable<StudentGradeProfileView> {
    return this.http
      .get<StudentGradeProfileView>(`${API_CONFIG.baseUrl}/calificaciones/ficha`, {
        params: { courseId, periodId }
      })
      .pipe(map((view) => this.normalizeStudentProfile(view)));
  }

  getReports(courseId: number, periodId: number): Observable<GradeReportView> {
    return this.http
      .get<GradeReportView>(`${API_CONFIG.baseUrl}/calificaciones/informes`, {
        params: { courseId, periodId }
      })
      .pipe(map((view) => this.normalizeReportView(view)));
  }

  private normalizeGradeBook(view: GradeBookView): GradeBookView {
    return {
      ...view,
      courseName: normalizeDashboardText(view.courseName),
      periodName: normalizeDashboardText(view.periodName),
      subjectName: normalizeDashboardText(view.subjectName),
      subjects: view.subjects.map((subject) => ({
        ...subject,
        name: normalizeDashboardText(subject.name)
      })),
      evaluations: view.evaluations.map((evaluation) => ({
        ...evaluation,
        code: normalizeDashboardText(evaluation.code),
        name: normalizeDashboardText(evaluation.name)
      })),
      students: view.students.map((student) => ({
        ...student,
        run: normalizeDashboardText(student.run),
        fullName: normalizeDashboardText(student.fullName),
        status: normalizeDashboardText(student.status),
        scores: student.scores.map((score) => ({
          ...score,
          code: normalizeDashboardText(score.code)
        }))
      }))
    };
  }

  private normalizeStudentProfile(view: StudentGradeProfileView): StudentGradeProfileView {
    return {
      ...view,
      courseName: normalizeDashboardText(view.courseName),
      periodName: normalizeDashboardText(view.periodName),
      students: view.students.map((student) => ({
        ...student,
        run: normalizeDashboardText(student.run),
        fullName: normalizeDashboardText(student.fullName),
        status: normalizeDashboardText(student.status),
        subjects: student.subjects.map((subject) => ({
          ...subject,
          subjectName: normalizeDashboardText(subject.subjectName)
        }))
      }))
    };
  }

  private normalizeReportView(view: GradeReportView): GradeReportView {
    return {
      ...view,
      courseName: normalizeDashboardText(view.courseName),
      periodName: normalizeDashboardText(view.periodName),
      students: view.students.map((student) => ({
        ...student,
        run: normalizeDashboardText(student.run),
        fullName: normalizeDashboardText(student.fullName),
        status: normalizeDashboardText(student.status),
        subjects: student.subjects.map((subject) => ({
          ...subject,
          subjectName: normalizeDashboardText(subject.subjectName)
        }))
      }))
    };
  }
}
