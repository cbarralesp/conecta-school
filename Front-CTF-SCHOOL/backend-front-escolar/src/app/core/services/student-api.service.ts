import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../constants/api.config';
import {
  StudentAttendanceDetail,
  StudentDashboard,
  StudentPortalSubject,
  StudentSubjectDocumentsResponse,
  StudentSubjectSummary
} from '../models/student.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly http = inject(HttpClient);

  getDashboard(semester?: number, schoolYear?: number): Observable<StudentDashboard> {
    let params = new HttpParams();

    if (semester != null) {
      params = params.set('semester', semester.toString());
    }

    if (schoolYear != null) {
      params = params.set('schoolYear', schoolYear.toString());
    }

    return this.http
      .get<StudentDashboard>(`${API_CONFIG.baseUrl}/student/dashboard`, { params })
      .pipe(map((dashboard) => this.normalizeDashboard(dashboard)));
  }

  getStudentSubjects(): Observable<StudentPortalSubject[]> {
    return this.http.get<StudentPortalSubject[]>(`${API_CONFIG.baseUrl}/student/subjects`).pipe(
      map((subjects) =>
        subjects.map((subject) => ({
          ...subject,
          subjectName: normalizeDashboardText(subject.subjectName),
          courseName: normalizeDashboardText(subject.courseName),
          teacherName: normalizeDashboardText(subject.teacherName)
        }))
      )
    );
  }

  getStudentSubjectDocuments(subjectId: number): Observable<StudentSubjectDocumentsResponse> {
    return this.http
      .get<StudentSubjectDocumentsResponse>(`${API_CONFIG.baseUrl}/student/subjects/${subjectId}/documents`)
      .pipe(
        map((response) => ({
          subject: {
            ...response.subject,
            subjectName: normalizeDashboardText(response.subject.subjectName),
            courseName: normalizeDashboardText(response.subject.courseName),
            semesterLabel: normalizeDashboardText(response.subject.semesterLabel),
            teacherName: normalizeDashboardText(response.subject.teacherName)
          },
          metrics: response.metrics,
          filters: response.filters.map((filter) => ({
            ...filter,
            label: normalizeDashboardText(filter.label)
          })),
          units: response.units.map((unit) => ({
            ...unit,
            unitNumber: normalizeDashboardText(unit.unitNumber),
            unitName: normalizeDashboardText(unit.unitName),
            classes: unit.classes.map((subjectClass) => ({
              ...subjectClass,
              classTitle: normalizeDashboardText(subjectClass.classTitle),
              documents: subjectClass.documents.map((document) => ({
                ...document,
                fileName: normalizeDashboardText(document.fileName),
                metaLabel: normalizeDashboardText(document.metaLabel)
              }))
            }))
          }))
        }))
      );
  }

  getStudentAttendance(): Observable<StudentAttendanceDetail> {
    return this.http.get<StudentAttendanceDetail>(`${API_CONFIG.baseUrl}/student/attendance`).pipe(
      map((response) => ({
        header: {
          ...response.header,
          studentName: normalizeDashboardText(response.header.studentName),
          courseName: normalizeDashboardText(response.header.courseName),
          periodLabel: normalizeDashboardText(response.header.periodLabel)
        },
        summary: response.summary,
        currentMonth: {
          ...response.currentMonth,
          monthLabel: normalizeDashboardText(response.currentMonth.monthLabel)
        },
        currentWeek: response.currentWeek.map((day) => ({
          ...day,
          date: normalizeDashboardText(day.date),
          dayLabel: normalizeDashboardText(day.dayLabel),
          status: normalizeDashboardText(day.status)
        })),
        recentRecords: response.recentRecords.map((record) => ({
          ...record,
          date: normalizeDashboardText(record.date),
          status: normalizeDashboardText(record.status),
          note: normalizeDashboardText(record.note),
          timeLabel: normalizeDashboardText(record.timeLabel),
          departureTime: normalizeDashboardText(record.departureTime),
          departureReason: normalizeDashboardText(record.departureReason),
          departureNote: normalizeDashboardText(record.departureNote)
        })),
        historyDays: (response.historyDays ?? []).map((day) => ({
          ...day,
          date: normalizeDashboardText(day.date),
          status: normalizeDashboardText(day.status)
        }))
      }))
    );
  }

  markDocumentReviewed(documentId: number): Observable<void> {
    return this.http.post<void>(`${API_CONFIG.baseUrl}/student/documents/${documentId}/reviewed`, {});
  }

  downloadStudentDocument(documentId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${API_CONFIG.baseUrl}/student/documents/${documentId}/download`, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  private normalizeDashboard(dashboard: StudentDashboard): StudentDashboard {
    const subjects = this.buildSubjects(dashboard);

    return {
      ...dashboard,
      studentName: normalizeDashboardText(dashboard.studentName),
      studentRun: normalizeDashboardText(dashboard.studentRun),
      enrolledCourses: dashboard.enrolledCourses.map((course) => ({
        ...course,
        courseName: normalizeDashboardText(course.courseName),
        courseCode: normalizeDashboardText(course.courseCode),
        status: normalizeDashboardText(course.status)
      })),
      weeklySchedule: dashboard.weeklySchedule.map((item) => ({
        ...item,
        dayOfWeek: normalizeDashboardText(item.dayOfWeek),
        courseName: normalizeDashboardText(item.courseName),
        subjectName: normalizeDashboardText(item.subjectName),
        room: normalizeDashboardText(item.room),
        subjectColorHex: item.subjectColorHex ?? null
      })),
      latestGrades: dashboard.latestGrades.map((grade) => ({
        ...grade,
        subjectName: normalizeDashboardText(grade.subjectName),
        evaluationName: normalizeDashboardText(grade.evaluationName),
        periodName: normalizeDashboardText(grade.periodName),
        recordedAt: normalizeDashboardText(grade.recordedAt)
      })),
      gradeSummary: (dashboard.gradeSummary ?? []).map((summary) => ({
        ...summary,
        subjectName: normalizeDashboardText(summary.subjectName),
        evaluations: summary.evaluations.map((evaluation) => ({
          ...evaluation,
          evaluationName: normalizeDashboardText(evaluation.evaluationName),
          periodName: normalizeDashboardText(evaluation.periodName),
          recordedAt: normalizeDashboardText(evaluation.recordedAt)
        }))
      })),
      upcomingActivities: dashboard.upcomingActivities.map((activity) => ({
        ...activity,
        title: normalizeDashboardText(activity.title),
        activityTypeName: normalizeDashboardText(activity.activityTypeName),
        date: normalizeDashboardText(activity.date),
        location: normalizeDashboardText(activity.location)
      })),
      subjects
    };
  }

  private buildSubjects(dashboard: StudentDashboard): StudentSubjectSummary[] {
    const subjectsMap = new Map<string, StudentSubjectSummary>();

    for (const item of dashboard.weeklySchedule) {
      const subjectName = normalizeDashboardText(item.subjectName);
      const courseName = normalizeDashboardText(item.courseName);
      const key = `${subjectName}::${courseName}`;
      const existing = subjectsMap.get(key);

      if (existing) {
        existing.weeklyBlocks += 1;
        continue;
      }

      subjectsMap.set(key, {
        subjectName,
        courseName,
        weeklyBlocks: 1
      });
    }

    for (const grade of dashboard.latestGrades) {
      const subjectName = normalizeDashboardText(grade.subjectName);
      const existing = Array.from(subjectsMap.values()).find((item) => item.subjectName === subjectName);
      if (existing) {
        continue;
      }

      subjectsMap.set(`${subjectName}::`, {
        subjectName,
        courseName: dashboard.enrolledCourses[0]?.courseName
          ? normalizeDashboardText(dashboard.enrolledCourses[0].courseName)
          : 'Curso asignado',
        weeklyBlocks: 0
      });
    }

    return Array.from(subjectsMap.values()).sort((left, right) =>
      left.subjectName.localeCompare(right.subjectName, 'es')
    );
  }
}
