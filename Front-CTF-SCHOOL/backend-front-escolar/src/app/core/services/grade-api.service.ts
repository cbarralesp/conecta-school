import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../constants/api.config';
import {
  GradeBookView,
  GradeCatalog,
  GradeEvaluationPayload,
  PedagogicalQuestionBankArea,
  PedagogicalReportView,
  GradeReportView,
  SavePedagogicalReportPayload,
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

  getPedagogicalReport(courseId: number, periodId: number, studentId: number): Observable<PedagogicalReportView> {
    return this.http
      .get<PedagogicalReportView>(`${API_CONFIG.baseUrl}/calificaciones/informes-pedagogicos`, {
        params: { courseId, periodId, studentId }
      })
      .pipe(map((view) => this.normalizePedagogicalReportView(view)));
  }

  savePedagogicalReport(payload: SavePedagogicalReportPayload): Observable<PedagogicalReportView> {
    return this.http
      .put<PedagogicalReportView>(`${API_CONFIG.baseUrl}/calificaciones/informes-pedagogicos`, payload)
      .pipe(map((view) => this.normalizePedagogicalReportView(view)));
  }

  getPedagogicalQuestionBank(levelCode: string): Observable<PedagogicalQuestionBankArea[]> {
    return this.http
      .get<PedagogicalQuestionBankArea[]>(`${API_CONFIG.baseUrl}/calificaciones/informes-pedagogicos/banco`, {
        params: { levelCode }
      })
      .pipe(
        map((areas) => areas.map((area) => ({
          ...area,
          key: normalizeDashboardText(area.key),
          title: normalizeDashboardText(area.title),
          questionKind: area.questionKind,
          questions: (area.questions ?? []).map((question) => ({
            ...question,
            label: normalizeDashboardText(question.label)
          }))
        })))
      );
  }

  private normalizeGradeBook(view: GradeBookView): GradeBookView {
    return {
      ...view,
      courseName: normalizeDashboardText(view.courseName),
      periodName: normalizeDashboardText(view.periodName),
      subjectName: normalizeDashboardText(view.subjectName),
      subjectEvaluationType: 'NUMERICA',
      subjects: view.subjects.map((subject) => ({
        ...subject,
        name: normalizeDashboardText(subject.name),
        evaluationType: 'NUMERICA'
      })),
      evaluations: view.evaluations.map((evaluation) => ({
        ...evaluation,
        code: normalizeDashboardText(evaluation.code),
        name: normalizeDashboardText(evaluation.name),
        registrationType: evaluation.registrationType ?? 'SUMATIVA'
      })),
      students: view.students.map((student) => ({
        ...student,
        run: normalizeDashboardText(student.run),
        fullName: normalizeDashboardText(student.fullName),
        status: normalizeDashboardText(student.status),
        scores: student.scores.map((score) => ({
          ...score,
          code: normalizeDashboardText(score.code),
          conceptCode: score.conceptCode ?? null,
          percentage: score.percentage ?? null,
          registrationType: score.registrationType ?? 'SUMATIVA'
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
          subjectName: normalizeDashboardText(subject.subjectName),
          evaluationType: 'NUMERICA',
          conceptSummaryCode: subject.conceptSummaryCode ?? null
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
          subjectName: normalizeDashboardText(subject.subjectName),
          evaluationType: 'NUMERICA',
          conceptSummaryCode: subject.conceptSummaryCode ?? null
        }))
      }))
    };
  }

  private normalizePedagogicalReportView(view: PedagogicalReportView): PedagogicalReportView {
    return {
      ...view,
      courseName: normalizeDashboardText(view.courseName),
      periodName: normalizeDashboardText(view.periodName),
      studentRun: normalizeDashboardText(view.studentRun),
      studentName: normalizeDashboardText(view.studentName),
      levelLabel: normalizeDashboardText(view.levelLabel),
      content: {
        ...view.content,
        documentTitle: normalizeDashboardText(view.content?.documentTitle ?? ''),
        educatorName: normalizeDashboardText(view.content?.educatorName ?? ''),
        teacherSignatureName: normalizeDashboardText(view.content?.teacherSignatureName ?? ''),
        guardianSignatureLabel: normalizeDashboardText(view.content?.guardianSignatureLabel ?? ''),
        developmentAreas: (view.content?.developmentAreas ?? []).map((area) => ({
          ...area,
          key: normalizeDashboardText(area.key),
          title: normalizeDashboardText(area.title),
          icon: normalizeDashboardText(area.icon),
          observation: normalizeDashboardText(area.observation ?? ''),
          items: (area.items ?? []).map((item) => ({
            ...item,
            questionId: item.questionId ?? null,
            label: normalizeDashboardText(item.label),
            answer: item.answer === 'SI' || item.answer === 'EP' || item.answer === 'NO'
              ? item.answer
              : item.achieved
                ? 'SI'
                : 'NO'
          }))
        })),
        attitudeArea: view.content?.attitudeArea
          ? {
              ...view.content.attitudeArea,
              key: normalizeDashboardText(view.content.attitudeArea.key),
              title: normalizeDashboardText(view.content.attitudeArea.title),
              icon: normalizeDashboardText(view.content.attitudeArea.icon),
              observation: normalizeDashboardText(view.content.attitudeArea.observation ?? ''),
              items: (view.content.attitudeArea.items ?? []).map((item) => ({
                ...item,
                questionId: item.questionId ?? null,
                label: normalizeDashboardText(item.label),
                answer: item.answer === 'SI' || item.answer === 'EP' || item.answer === 'NO'
                  ? item.answer
                  : item.achieved
                    ? 'SI'
                    : 'NO'
              }))
            }
          : null,
        familyRecommendations: this.normalizeSingleFamilyRecommendation(view.content?.familyRecommendations)
      }
    };
  }

  private normalizeSingleFamilyRecommendation(recommendations: string[] | null | undefined): string[] {
    const firstFilledRecommendation = (recommendations ?? [])
      .map((item) => normalizeDashboardText(item))
      .find((item) => item.length > 0);
    return [firstFilledRecommendation ?? ''];
  }
}
