import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.config';
import {
  TeacherDashboard,
  TeacherPlanningDetail,
  TeacherPlanningUpdateRequest
} from '../models/teacher-dashboard.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class TeacherDashboardApiService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<TeacherDashboard> {
    return this.http.get<TeacherDashboard>(`${API_CONFIG.baseUrl}/teacher/dashboard`).pipe(
      map((dashboard) => this.normalizeDashboard(dashboard))
    );
  }

  getPlanningDetail(planningId: number): Observable<TeacherPlanningDetail> {
    return this.http.get<TeacherPlanningDetail>(
      `${API_CONFIG.baseUrl}/teacher/plannings/${planningId}`
    ).pipe(map((detail) => this.normalizePlanningDetail(detail)));
  }

  updatePlanning(
    planningId: number,
    payload: TeacherPlanningUpdateRequest
  ): Observable<TeacherPlanningDetail> {
    return this.http.put<TeacherPlanningDetail>(
      `${API_CONFIG.baseUrl}/teacher/plannings/${planningId}`,
      payload
    ).pipe(map((detail) => this.normalizePlanningDetail(detail)));
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
      })),
      planningItems: dashboard.planningItems.map((item) => ({
        ...item,
        title: normalizeDashboardText(item.title),
        unit: normalizeDashboardText(item.unit),
        learningObjective: normalizeDashboardText(item.learningObjective),
        status: normalizeDashboardText(item.status),
        courseName: normalizeDashboardText(item.courseName),
        subjectName: normalizeDashboardText(item.subjectName),
        resources: normalizeDashboardText(item.resources),
        activities: normalizeDashboardText(item.activities),
        evaluation: normalizeDashboardText(item.evaluation),
        observations: normalizeDashboardText(item.observations)
      }))
    };
  }

  private normalizePlanningDetail(detail: TeacherPlanningDetail): TeacherPlanningDetail {
    return {
      ...detail,
      title: normalizeDashboardText(detail.title),
      unit: normalizeDashboardText(detail.unit),
      learningObjective: normalizeDashboardText(detail.learningObjective),
      status: normalizeDashboardText(detail.status),
      courseName: normalizeDashboardText(detail.courseName),
      subjectName: normalizeDashboardText(detail.subjectName),
      teacherName: normalizeDashboardText(detail.teacherName),
      resources: normalizeDashboardText(detail.resources),
      activities: normalizeDashboardText(detail.activities),
      evaluation: normalizeDashboardText(detail.evaluation),
      observations: normalizeDashboardText(detail.observations)
    };
  }
}
