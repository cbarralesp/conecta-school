import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.config';
import {
  AttendanceCatalog,
  AttendanceStudentSummary,
  DailyAttendanceView,
  MonthlyAttendanceView,
  SaveDailyAttendancePayload,
  WeeklyAttendanceView
} from '../models/attendance.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  private readonly http = inject(HttpClient);

  getCatalog(): Observable<AttendanceCatalog> {
    return this.http.get<AttendanceCatalog>(`${API_CONFIG.baseUrl}/asistencia/catalogo`).pipe(
      map((catalog) => ({
        ...catalog,
        courses: catalog.courses.map((course) => ({
          ...course,
          name: normalizeDashboardText(course.name)
        }))
      }))
    );
  }

  getDaily(courseId: number, date: string): Observable<DailyAttendanceView> {
    return this.http.get<DailyAttendanceView>(`${API_CONFIG.baseUrl}/asistencia/diaria`, {
      params: { courseId, date }
    }).pipe(map((view) => this.normalizeDailyView(view)));
  }

  saveDaily(payload: SaveDailyAttendancePayload): Observable<DailyAttendanceView> {
    return this.http.put<DailyAttendanceView>(`${API_CONFIG.baseUrl}/asistencia/diaria`, payload).pipe(
      map((view) => this.normalizeDailyView(view))
    );
  }

  getWeekly(courseId: number, startDate: string): Observable<WeeklyAttendanceView> {
    return this.http.get<WeeklyAttendanceView>(`${API_CONFIG.baseUrl}/asistencia/semanal`, {
      params: { courseId, startDate }
    }).pipe(
      map((view) => ({
        ...view,
        courseName: normalizeDashboardText(view.courseName),
        weekLabel: normalizeDashboardText(view.weekLabel),
        summary: {
          averageAttendance: view.summary?.averageAttendance ?? 0,
          totalAbsences: view.summary?.totalAbsences ?? 0,
          totalLate: view.summary?.totalLate ?? 0,
          activeAlerts: view.summary?.activeAlerts ?? view.alerts.length
        },
        dates: view.dates.map((date) => normalizeDashboardText(date)),
        students: view.students.map((student) => ({
          ...student,
          fullName: normalizeDashboardText(student.fullName),
          statusBadge: normalizeDashboardText(student.statusBadge),
          days: student.days.map((day) => ({
            ...day,
            status: normalizeDashboardText(day.status)
          }))
        })),
        alerts: view.alerts.map((alert) => ({
          ...alert,
          level: normalizeDashboardText(alert.level),
          studentName: normalizeDashboardText(alert.studentName),
          message: normalizeDashboardText(alert.message)
        }))
      }))
    );
  }

  getMonthly(courseId: number, month: string): Observable<MonthlyAttendanceView> {
    return this.http.get<MonthlyAttendanceView>(`${API_CONFIG.baseUrl}/asistencia/mensual`, {
      params: { courseId, month }
    }).pipe(
      map((view) => ({
        ...view,
        courseName: normalizeDashboardText(view.courseName),
        monthLabel: normalizeDashboardText(view.monthLabel),
        distribution: {
          ...view.distribution
        },
        suspendedDates: (view.suspendedDates ?? []).map((date) => normalizeDashboardText(date)),
        specialDates: (view.specialDates ?? []).map((specialDate) => ({
          ...specialDate,
          date: normalizeDashboardText(specialDate.date),
          type: normalizeDashboardText(specialDate.type) as 'VACACIONES' | 'FERIADO' | 'INTERFERIADO' | 'SUSPENSION',
          label: normalizeDashboardText(specialDate.label)
        })),
        dailySummary: view.dailySummary.map((day) => ({
          ...day,
          dayLabel: normalizeDashboardText(day.dayLabel)
        })),
        students: view.students.map((student) => ({
          ...student,
          fullName: normalizeDashboardText(student.fullName),
          riskStatus: normalizeDashboardText(student.riskStatus),
          days: student.days.map((day) => ({
            ...day,
            status: normalizeDashboardText(day.status),
            departureReason: normalizeDashboardText(day.departureReason) as
              | 'MEDICO'
              | 'TRAMITE'
              | 'FAMILIAR'
              | 'OTRO'
              | null,
            departureNote: normalizeDashboardText(day.departureNote)
          }))
        }))
      }))
    );
  }

  getStudentSummary(
    courseId: number,
    studentId: number,
    schoolYear: number,
    semester: number
  ): Observable<AttendanceStudentSummary> {
    return this.http.get<AttendanceStudentSummary>(`${API_CONFIG.baseUrl}/asistencia/resumen-estudiante`, {
      params: {
        courseId,
        studentId,
        schoolYear,
        semester
      }
    });
  }

  private normalizeDailyView(view: DailyAttendanceView): DailyAttendanceView {
    return {
      ...view,
      courseName: normalizeDashboardText(view.courseName),
      classSuspended: !!view.classSuspended,
      suspensionMessage: normalizeDashboardText(view.suspensionMessage),
      summary: {
        markedCount:
          view.summary?.markedCount ??
          (view.presentCount ?? 0) + (view.absentCount ?? 0) + (view.lateCount ?? 0),
        progressPercent: view.summary?.progressPercent ?? 0,
        presentPercentage: view.summary?.presentPercentage ?? 0,
        absentPercentage: view.summary?.absentPercentage ?? 0,
        latePercentage: view.summary?.latePercentage ?? 0
      },
      students: view.students.map((student) => ({
        ...student,
        fullName: normalizeDashboardText(student.fullName),
        status: normalizeDashboardText(student.status),
        note: normalizeDashboardText(student.note),
        departureReason: normalizeDashboardText(student.departureReason) as
          | 'MEDICO'
          | 'TRAMITE'
          | 'FAMILIAR'
          | 'OTRO'
          | null,
        departureNote: normalizeDashboardText(student.departureNote)
      }))
    };
  }
}
