import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../constants/api.config';
import { Subject, SubjectPayload } from '../models/subject.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class SubjectApiService {
  private readonly http = inject(HttpClient);

  findAll(filters?: { search?: string; level?: 'all' | 'initial' | 'basic' | 'media' }): Observable<Subject[]> {
    let params = new HttpParams();
    if (filters?.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters?.level && filters.level !== 'all') {
      params = params.set('level', filters.level);
    }

    return this.http
      .get<Subject[]>(`${API_CONFIG.baseUrl}/asignaturas`, { params })
      .pipe(map((subjects) => subjects.map((subject) => this.normalizeSubject(subject))));
  }

  create(payload: SubjectPayload): Observable<Subject> {
    return this.http
      .post<Subject>(`${API_CONFIG.baseUrl}/asignaturas`, payload)
      .pipe(map((subject) => this.normalizeSubject(subject)));
  }

  update(subjectId: number, payload: SubjectPayload): Observable<Subject> {
    return this.http
      .put<Subject>(`${API_CONFIG.baseUrl}/asignaturas/${subjectId}`, payload)
      .pipe(map((subject) => this.normalizeSubject(subject)));
  }

  delete(subjectId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/asignaturas/${subjectId}`);
  }

  private normalizeSubject(subject: Subject): Subject {
    return {
      ...subject,
      code: normalizeDashboardText(subject.code),
      name: normalizeDashboardText(subject.name),
      area: normalizeDashboardText(subject.area),
      description: normalizeDashboardText(subject.description),
      referenceLevel: normalizeDashboardText(subject.referenceLevel),
      evaluationType: subject.evaluationType ?? 'NUMERICA',
      displayLevel: normalizeDashboardText(subject.displayLevel ?? ''),
      applicableGradeIds: (subject.applicableGradeIds ?? []).map(Number),
      applicableGradeNames: (subject.applicableGradeNames ?? []).map((name) => normalizeDashboardText(name)),
      applicableCourseIds: (subject.applicableCourseIds ?? []).map(Number),
      applicableCourseNames: (subject.applicableCourseNames ?? []).map((name) => normalizeDashboardText(name)),
      assignedTeachers: (subject.assignedTeachers ?? []).map((teacher) => ({
        ...teacher,
        code: normalizeDashboardText(teacher.code),
        fullName: normalizeDashboardText(teacher.fullName)
      }))
    };
  }
}
