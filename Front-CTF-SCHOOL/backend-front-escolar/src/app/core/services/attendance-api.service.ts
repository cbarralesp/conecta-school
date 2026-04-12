import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.config';
import {
  AttendanceCatalog,
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
        students: view.students.map((student) => ({
          ...student,
          fullName: normalizeDashboardText(student.fullName),
          riskStatus: normalizeDashboardText(student.riskStatus)
        }))
      }))
    );
  }

  private normalizeDailyView(view: DailyAttendanceView): DailyAttendanceView {
    return {
      ...view,
      courseName: normalizeDashboardText(view.courseName),
      students: view.students.map((student) => ({
        ...student,
        fullName: normalizeDashboardText(student.fullName),
        status: normalizeDashboardText(student.status),
        note: normalizeDashboardText(student.note)
      }))
    };
  }
}
