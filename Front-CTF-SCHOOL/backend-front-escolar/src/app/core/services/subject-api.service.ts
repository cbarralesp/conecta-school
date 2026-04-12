import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../constants/api.config';
import { Subject, SubjectPayload } from '../models/subject.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class SubjectApiService {
  private readonly http = inject(HttpClient);

  findAll(): Observable<Subject[]> {
    return this.http
      .get<Subject[]>(`${API_CONFIG.baseUrl}/asignaturas`)
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
      referenceLevel: normalizeDashboardText(subject.referenceLevel)
    };
  }
}
