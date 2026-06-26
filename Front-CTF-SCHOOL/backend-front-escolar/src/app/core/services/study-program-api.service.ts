import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../constants/api.config';
import { StudyProgramDetail, StudyProgramSummary } from '../models/study-program.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class StudyProgramApiService {
  private readonly http = inject(HttpClient);

  findPrograms(filters?: {
    subjectName?: string;
    grade?: string;
    courseName?: string;
  }): Observable<StudyProgramSummary[]> {
    let params = new HttpParams();
    if (filters?.subjectName?.trim()) {
      params = params.set('subjectName', filters.subjectName.trim());
    }
    if (filters?.grade?.trim()) {
      params = params.set('grade', filters.grade.trim());
    }
    if (filters?.courseName?.trim()) {
      params = params.set('courseName', filters.courseName.trim());
    }

    return this.http.get<StudyProgramSummary[]>(`${API_CONFIG.baseUrl}/study-programs`, { params }).pipe(
      map((programs) =>
        programs.map((program) => ({
          ...program,
          code: normalizeDashboardText(program.code),
          subject: normalizeDashboardText(program.subject),
          grade: normalizeDashboardText(program.grade),
          decree: normalizeDashboardText(program.decree),
          source: normalizeDashboardText(program.source),
          edition: normalizeDashboardText(program.edition)
        }))
      )
    );
  }

  getProgram(programId: number): Observable<StudyProgramDetail> {
    return this.http.get<StudyProgramDetail>(`${API_CONFIG.baseUrl}/study-programs/${programId}`).pipe(
      map((program) => ({
        ...program,
        code: normalizeDashboardText(program.code),
        subject: normalizeDashboardText(program.subject),
        grade: normalizeDashboardText(program.grade),
        decree: normalizeDashboardText(program.decree),
        source: normalizeDashboardText(program.source),
        isbn: normalizeDashboardText(program.isbn),
        edition: normalizeDashboardText(program.edition),
        permanentObjectivesDescription: normalizeDashboardText(program.permanentObjectivesDescription),
        axes: (program.axes ?? []).map((axis) => normalizeDashboardText(axis)),
        globalAttitudes: (program.globalAttitudes ?? []).map((attitude) => ({
          ...attitude,
          code: normalizeDashboardText(attitude.code),
          description: normalizeDashboardText(attitude.description)
        })),
        units: (program.units ?? []).map((unit) => ({
          ...unit,
          name: normalizeDashboardText(unit.name),
          readingPurpose: normalizeDashboardText(unit.readingPurpose),
          writingPurpose: normalizeDashboardText(unit.writingPurpose),
          oralCommunicationPurpose: normalizeDashboardText(unit.oralCommunicationPurpose),
          attitudes: (unit.attitudes ?? []).map((attitude) => ({
            ...attitude,
            code: normalizeDashboardText(attitude.code),
            description: normalizeDashboardText(attitude.description)
          })),
          objectives: (unit.objectives ?? []).map((objective) => ({
            ...objective,
            code: normalizeDashboardText(objective.code),
            axis: normalizeDashboardText(objective.axis),
            description: normalizeDashboardText(objective.description),
            subItems: (objective.subItems ?? []).map((item) => normalizeDashboardText(item)),
            evaluationIndicators: (objective.evaluationIndicators ?? []).map((item) => normalizeDashboardText(item))
          }))
        }))
      }))
    );
  }
}
