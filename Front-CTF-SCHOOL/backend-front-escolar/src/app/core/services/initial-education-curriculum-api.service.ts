import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../constants/api.config';
import { InitialEducationCurriculumDetail } from '../models/initial-education-curriculum.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class InitialEducationCurriculumApiService {
  private readonly http = inject(HttpClient);

  getCurriculumDetail(filters: {
    grade: string;
    visibleSubject: string;
    ambit: string;
    nucleus: string;
  }): Observable<InitialEducationCurriculumDetail> {
    const params = new HttpParams()
      .set('grade', filters.grade)
      .set('visibleSubject', filters.visibleSubject)
      .set('ambit', filters.ambit)
      .set('nucleus', filters.nucleus);

    return this.http.get<InitialEducationCurriculumDetail>(`${API_CONFIG.baseUrl}/initial-education-programs/detail`, { params }).pipe(
      map((curriculum) => ({
        ...curriculum,
        code: normalizeDashboardText(curriculum.code),
        grade: normalizeDashboardText(curriculum.grade),
        visibleSubject: normalizeDashboardText(curriculum.visibleSubject),
        ambit: normalizeDashboardText(curriculum.ambit),
        nucleus: normalizeDashboardText(curriculum.nucleus),
        objectives: (curriculum.objectives ?? []).map((objective) => ({
          ...objective,
          code: normalizeDashboardText(objective.code),
          description: normalizeDashboardText(objective.description),
          evaluationIndicators: (objective.evaluationIndicators ?? []).map((item) => normalizeDashboardText(item)),
          activities: (objective.activities ?? []).map((activity) => ({
            ...activity,
            description: normalizeDashboardText(activity.description)
          }))
        }))
      }))
    );
  }
}
