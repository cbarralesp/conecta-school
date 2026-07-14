import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.config';
import { TeacherDashboard } from '../models/teacher-dashboard.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class TeacherDashboardApiService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<TeacherDashboard> {
    return this.http.get<TeacherDashboard>(`${API_CONFIG.baseUrl}/teacher/dashboard`).pipe(
      map((dashboard) => this.normalizeDashboard(dashboard))
    );
  }

  private normalizeDashboard(dashboard: TeacherDashboard): TeacherDashboard {
    return {
      ...dashboard,
      teacherCode: normalizeDashboardText(dashboard.teacherCode),
      teacherName: normalizeDashboardText(dashboard.teacherName),
      specialty: normalizeDashboardText(dashboard.specialty),
      assignedCourses: dashboard.assignedCourses.map((course) => ({
        ...course,
        courseName: normalizeDashboardText(course.courseName),
        courseCode: normalizeDashboardText(course.courseCode),
        subjectName: normalizeDashboardText(course.subjectName)
      })),
      weeklySchedule: dashboard.weeklySchedule.map((item) => ({
        ...item,
        dayOfWeek: normalizeDashboardText(item.dayOfWeek),
        courseName: normalizeDashboardText(item.courseName),
        subjectName: normalizeDashboardText(item.subjectName),
        room: normalizeDashboardText(item.room)
      })),
      todaySchedulePreview: (dashboard.todaySchedulePreview ?? []).map((item) => ({
        ...item,
        dayOfWeek: normalizeDashboardText(item.dayOfWeek),
        courseName: normalizeDashboardText(item.courseName),
        subjectName: normalizeDashboardText(item.subjectName),
        room: normalizeDashboardText(item.room)
      }))
    };
  }
}
