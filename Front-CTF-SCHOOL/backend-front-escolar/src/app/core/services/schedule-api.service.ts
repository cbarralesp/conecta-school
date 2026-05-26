import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.config';
import {
  ScheduleBlockCreatePayload,
  ScheduleBlockType,
  ScheduleCatalog,
  ScheduleEntry,
  SchedulePayload,
  ScheduleRowTimePayload
} from '../models/schedule.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

const normalizeScheduleBlockType = (value: string): ScheduleBlockType =>
  normalizeDashboardText(value).toUpperCase() === 'RECREO' ? 'RECREO' : 'CLASE';

@Injectable({ providedIn: 'root' })
export class ScheduleApiService {
  private readonly http = inject(HttpClient);

  getCatalog(courseId?: number | null): Observable<ScheduleCatalog> {
    return this.http.get<ScheduleCatalog>(`${API_CONFIG.baseUrl}/horarios/catalogo`, {
      params: courseId ? { courseId } : {}
    }).pipe(
      map((catalog) => ({
        ...catalog,
        courses: catalog.courses.map((course) => ({
          ...course,
          code: normalizeDashboardText(course.code),
          name: normalizeDashboardText(course.name),
          scheduleType: normalizeDashboardText(course.scheduleType)
        })),
        periods: catalog.periods.map((period) => ({
          ...period,
          name: normalizeDashboardText(period.name)
        })),
        teachers: catalog.teachers.map((teacher) => ({
          ...teacher,
          code: normalizeDashboardText(teacher.code),
          fullName: normalizeDashboardText(teacher.fullName),
          specialty: normalizeDashboardText(teacher.specialty)
        })),
        subjects: catalog.subjects.map((subject) => ({
          ...subject,
          code: normalizeDashboardText(subject.code),
          name: normalizeDashboardText(subject.name),
          area: normalizeDashboardText(subject.area),
          description: normalizeDashboardText(subject.description),
          referenceLevel: normalizeDashboardText(subject.referenceLevel)
        })),
        blocks: catalog.blocks.map((block) => ({
          ...block,
          dayOfWeek: normalizeDashboardText(block.dayOfWeek),
          blockType: normalizeScheduleBlockType(block.blockType)
        }))
      }))
    );
  }

  getByCourse(courseId: number, periodId: number): Observable<ScheduleEntry[]> {
    return this.http.get<ScheduleEntry[]>(`${API_CONFIG.baseUrl}/horarios`, {
      params: { courseId, periodId }
    }).pipe(
      map((entries) => entries.map((entry) => ({
        ...entry,
        periodName: normalizeDashboardText(entry.periodName),
        courseName: normalizeDashboardText(entry.courseName),
        teacherCode: normalizeDashboardText(entry.teacherCode),
        teacherFullName: normalizeDashboardText(entry.teacherFullName),
        subjectCode: normalizeDashboardText(entry.subjectCode),
        subjectName: normalizeDashboardText(entry.subjectName),
        dayOfWeek: normalizeDashboardText(entry.dayOfWeek),
        blockType: normalizeScheduleBlockType(entry.blockType),
        room: normalizeDashboardText(entry.room)
      })))
    );
  }

  create(payload: SchedulePayload): Observable<ScheduleEntry> {
    return this.http.post<ScheduleEntry>(`${API_CONFIG.baseUrl}/horarios`, payload);
  }

  update(scheduleId: number, payload: SchedulePayload): Observable<ScheduleEntry> {
    return this.http.put<ScheduleEntry>(`${API_CONFIG.baseUrl}/horarios/${scheduleId}`, payload);
  }

  delete(scheduleId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/horarios/${scheduleId}`);
  }

  updateRowTime(order: number, payload: ScheduleRowTimePayload & { courseId: number }): Observable<void> {
    return this.http.put<void>(`${API_CONFIG.baseUrl}/horarios/bloques/${order}`, payload);
  }

  createRow(payload: ScheduleBlockCreatePayload & { courseId: number }): Observable<void> {
    return this.http.post<void>(`${API_CONFIG.baseUrl}/horarios/bloques`, payload);
  }

  createBreakRow(payload: ScheduleRowTimePayload & { courseId: number }): Observable<void> {
    return this.http.post<void>(`${API_CONFIG.baseUrl}/horarios/bloques/recreo`, payload);
  }

  deleteRow(order: number, courseId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/horarios/bloques/${order}`, {
      params: { courseId }
    });
  }
}
