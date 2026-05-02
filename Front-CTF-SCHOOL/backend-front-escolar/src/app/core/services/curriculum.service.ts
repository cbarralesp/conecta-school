import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../constants/api.config';
import {
  CurriculumGrade,
  CurriculumObjective,
  CurriculumSubject
} from '../models/curriculum.models';

@Injectable({ providedIn: 'root' })
export class CurriculumService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_CONFIG.baseUrl}/curriculum`;

  getSubjects(): Observable<CurriculumSubject[]> {
    return this.http.get<CurriculumSubject[]>(`${this.base}/subjects`);
  }

  getGradesBySubject(subjectId: string): Observable<CurriculumGrade[]> {
    return this.http.get<CurriculumGrade[]>(`${this.base}/subjects/${subjectId}/grades`);
  }

  getObjectivesByGrade(gradeId: string): Observable<CurriculumObjective[]> {
    return this.http.get<CurriculumObjective[]>(`${this.base}/grades/${gradeId}/objectives`);
  }

  searchObjectives(params: {
    subjectId?: string;
    grado?: string;
    eje?: string;
    tipo?: string;
  }): Observable<CurriculumObjective[]> {
    let httpParams = new HttpParams();
    if (params.subjectId) {
      httpParams = httpParams.set('subjectId', params.subjectId);
    }
    if (params.grado) {
      httpParams = httpParams.set('grado', params.grado);
    }
    if (params.eje) {
      httpParams = httpParams.set('eje', params.eje);
    }
    if (params.tipo) {
      httpParams = httpParams.set('tipo', params.tipo);
    }

    return this.http.get<CurriculumObjective[]>(`${this.base}/objectives/search`, {
      params: httpParams
    });
  }

  getObjectivesByContext(subjectName: string, courseName: string): Observable<CurriculumObjective[]> {
    const params = new HttpParams()
      .set('subjectName', subjectName)
      .set('courseName', courseName);

    return this.http.get<CurriculumObjective[]>(`${this.base}/objectives/context`, {
      params
    });
  }
}
