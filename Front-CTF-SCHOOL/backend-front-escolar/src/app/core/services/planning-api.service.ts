import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../constants/api.config';
import {
  PlanningClass,
  PlanningClassCatalogs,
  PlanningClassPayload,
  PlanningClassDocument,
  PlanningDocument,
  PlanningDocumentFileType,
  PlanningDocumentFilters,
  PlanningSummary,
  PlanningSummaryFilters,
  PlanningUnit,
  PlanningUnitCatalogAssignment,
  PlanningUnitCatalogs,
  PlanningUnitPayload,
  PlanningUnitSummary
} from '../models/planning.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class PlanningApiService {
  private readonly http = inject(HttpClient);

  getUnitCatalogs(): Observable<PlanningUnitCatalogs> {
    return this.http.get<PlanningUnitCatalogs>(`${API_CONFIG.baseUrl}/planning/units/catalogs`).pipe(
      map((catalogs) => ({
        ...catalogs,
        teachingAssignments: catalogs.teachingAssignments.map((assignment) =>
          this.normalizeAssignment(assignment)
        ),
        unitNumbers: catalogs.unitNumbers.map((item) => ({
          ...item,
          code: normalizeDashboardText(item.code),
          label: normalizeDashboardText(item.label)
        })),
        weekOptions: catalogs.weekOptions.map((item) => ({
          ...item,
          code: normalizeDashboardText(item.code),
          label: normalizeDashboardText(item.label)
        }))
      }))
    );
  }

  getUnits(): Observable<PlanningUnitSummary[]> {
    return this.http.get<PlanningUnitSummary[]>(`${API_CONFIG.baseUrl}/planning/units`).pipe(
      map((units) =>
        units.map((unit) => ({
          ...unit,
          unitNumberLabel: normalizeDashboardText(unit.unitNumberLabel),
          name: normalizeDashboardText(unit.name),
          subjectName: normalizeDashboardText(unit.subjectName),
          courseName: normalizeDashboardText(unit.courseName),
          status: normalizeDashboardText(unit.status) as PlanningUnitSummary['status']
        }))
      )
    );
  }

  createUnit(payload: PlanningUnitPayload): Observable<PlanningUnit> {
    return this.http
      .post<PlanningUnit>(`${API_CONFIG.baseUrl}/planning/units`, payload)
      .pipe(map((unit) => this.normalizeUnit(unit)));
  }

  saveUnitDraft(payload: PlanningUnitPayload): Observable<PlanningUnit> {
    return this.http
      .post<PlanningUnit>(`${API_CONFIG.baseUrl}/planning/units/draft`, payload)
      .pipe(map((unit) => this.normalizeUnit(unit)));
  }

  updateUnit(unitId: number, payload: Pick<PlanningUnitPayload, 'unitNumber' | 'name'>): Observable<PlanningUnit> {
    return this.http
      .put<PlanningUnit>(`${API_CONFIG.baseUrl}/planning/units/${unitId}`, payload)
      .pipe(map((unit) => this.normalizeUnit(unit)));
  }

  getClassCatalogs(): Observable<PlanningClassCatalogs> {
    return this.http
      .get<PlanningClassCatalogs>(`${API_CONFIG.baseUrl}/planning/classes/catalogs`)
      .pipe(
        map((catalogs) => ({
          ...catalogs,
          units: catalogs.units.map((unit) => ({
            ...unit,
            unitNumberLabel: normalizeDashboardText(unit.unitNumberLabel),
            unitName: normalizeDashboardText(unit.unitName),
            learningObjectives: normalizeDashboardText(unit.learningObjectives),
            subjectName: normalizeDashboardText(unit.subjectName),
            courseName: normalizeDashboardText(unit.courseName),
            status: normalizeDashboardText(unit.status)
          })),
          objectives: catalogs.objectives.map((objective) => ({
            ...objective,
            code: normalizeDashboardText(objective.code),
            label: normalizeDashboardText(objective.label),
            description: normalizeDashboardText(objective.description)
          })),
          evaluationTypes: catalogs.evaluationTypes.map((item) => ({
            ...item,
            code: normalizeDashboardText(item.code),
            label: normalizeDashboardText(item.label)
          })),
          durationOptions: catalogs.durationOptions.map((item) => ({
            ...item,
            code: normalizeDashboardText(item.code),
            label: normalizeDashboardText(item.label)
          }))
        }))
      );
  }

  getClasses(filters?: {
    courseId?: number;
    subjectId?: number;
    semester?: number;
    month?: number;
    status?: PlanningClass['status'];
    documentType?: PlanningDocumentFileType;
    search?: string;
  }): Observable<PlanningClass[]> {
    let params = new HttpParams();
    if (filters?.courseId != null) {
      params = params.set('courseId', filters.courseId);
    }
    if (filters?.subjectId != null) {
      params = params.set('subjectId', filters.subjectId);
    }
    if (filters?.semester != null) {
      params = params.set('semester', filters.semester);
    }
    if (filters?.month != null) {
      params = params.set('month', filters.month);
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.documentType) {
      params = params.set('documentType', filters.documentType);
    }
    if (filters?.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }

    return this.http.get<PlanningClass[]>(`${API_CONFIG.baseUrl}/planning/classes`, { params }).pipe(
      map((classes) => classes.map((planningClass) => this.normalizeClass(planningClass)))
    );
  }

  createClass(payload: PlanningClassPayload): Observable<PlanningClass> {
    return this.http
      .post<PlanningClass>(`${API_CONFIG.baseUrl}/planning/classes`, payload)
      .pipe(map((planningClass) => this.normalizeClass(planningClass)));
  }

  saveClassDraft(payload: PlanningClassPayload): Observable<PlanningClass> {
    return this.http
      .post<PlanningClass>(`${API_CONFIG.baseUrl}/planning/classes/draft`, payload)
      .pipe(map((planningClass) => this.normalizeClass(planningClass)));
  }

  updateClassTitle(classId: number, title: string): Observable<PlanningClass> {
    return this.http
      .put<PlanningClass>(`${API_CONFIG.baseUrl}/planning/classes/${classId}`, { title })
      .pipe(map((planningClass) => this.normalizeClass(planningClass)));
  }

  deleteClass(classId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/planning/classes/${classId}`);
  }

  uploadClassDocument(
    classId: number,
    file: File,
    visibleToStudents: boolean
  ): Observable<PlanningClassDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('visibleToStudents', String(visibleToStudents));

    return this.http
      .post<PlanningClassDocument>(
        `${API_CONFIG.baseUrl}/planning/classes/${classId}/documents`,
        formData
      )
      .pipe(map((document) => this.normalizeDocument(document)));
  }

  removeClassDocument(classId: number, documentId: number): Observable<void> {
    return this.http.delete<void>(
      `${API_CONFIG.baseUrl}/planning/classes/${classId}/documents/${documentId}`
    );
  }

  getPlanningDocuments(filters?: PlanningDocumentFilters): Observable<PlanningDocument[]> {
    let params = new HttpParams();
    if (filters?.type) {
      params = params.set('type', filters.type);
    }
    if (filters?.unitId != null) {
      params = params.set('unitId', filters.unitId);
    }
    if (filters?.classId != null) {
      params = params.set('classId', filters.classId);
    }
    if (filters?.subjectId != null) {
      params = params.set('subjectId', filters.subjectId);
    }
    if (filters?.visibleToStudents != null) {
      params = params.set('visibleToStudents', filters.visibleToStudents);
    }

    return this.http
      .get<PlanningDocument[]>(`${API_CONFIG.baseUrl}/planning/documents`, { params })
      .pipe(map((documents) => documents.map((document) => this.normalizePlanningDocument(document))));
  }

  downloadPlanningDocument(documentId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${API_CONFIG.baseUrl}/planning/documents/${documentId}/download`, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  deletePlanningDocument(documentId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/planning/documents/${documentId}`);
  }

  getPlanningSummary(filters?: PlanningSummaryFilters): Observable<PlanningSummary> {
    let params = new HttpParams();
    if (filters?.subjectId != null) {
      params = params.set('subjectId', filters.subjectId);
    }
    if (filters?.year != null) {
      params = params.set('year', filters.year);
    }
    if (filters?.courseId != null) {
      params = params.set('courseId', filters.courseId);
    }
    if (filters?.semester != null) {
      params = params.set('semester', filters.semester);
    }
    if (filters?.month != null) {
      params = params.set('month', filters.month);
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.documentType) {
      params = params.set('documentType', filters.documentType);
    }

    return this.http
      .get<PlanningSummary>(`${API_CONFIG.baseUrl}/planning/summary`, { params })
      .pipe(
        map((summary) => ({
          summary: summary.summary,
          subjects: summary.subjects.map((subject) => ({
            ...subject,
            name: normalizeDashboardText(subject.name)
          })),
          units: summary.units.map((unit) => ({
            ...unit,
            code: normalizeDashboardText(unit.code),
            name: normalizeDashboardText(unit.name),
            subjectName: normalizeDashboardText(unit.subjectName),
            courseName: normalizeDashboardText(unit.courseName),
            weekRange: normalizeDashboardText(unit.weekRange),
            status: normalizeDashboardText(unit.status) as typeof unit.status
          }))
        }))
      );
  }

  private normalizeAssignment(
    assignment: PlanningUnitCatalogAssignment
  ): PlanningUnitCatalogAssignment {
    return {
      ...assignment,
      subjectCode: normalizeDashboardText(assignment.subjectCode),
      subjectName: normalizeDashboardText(assignment.subjectName),
      courseCode: normalizeDashboardText(assignment.courseCode),
      courseName: normalizeDashboardText(assignment.courseName)
    };
  }

  private normalizeUnit(unit: PlanningUnit): PlanningUnit {
    return {
      ...unit,
      subjectName: normalizeDashboardText(unit.subjectName),
      courseName: normalizeDashboardText(unit.courseName),
      unitNumber: normalizeDashboardText(unit.unitNumber),
      unitNumberLabel: normalizeDashboardText(unit.unitNumberLabel),
      name: normalizeDashboardText(unit.name),
      generalDescription: normalizeDashboardText(unit.generalDescription),
      learningObjectives: normalizeDashboardText(unit.learningObjectives),
      achievementIndicators: normalizeDashboardText(unit.achievementIndicators),
      status: normalizeDashboardText(unit.status) as PlanningUnit['status'],
      createdBy: normalizeDashboardText(unit.createdBy)
    };
  }

  private normalizeClass(planningClass: PlanningClass): PlanningClass {
    return {
      ...planningClass,
      subjectName: normalizeDashboardText(planningClass.subjectName),
      courseName: normalizeDashboardText(planningClass.courseName),
      unitNumberLabel: normalizeDashboardText(planningClass.unitNumberLabel),
      unitName: normalizeDashboardText(planningClass.unitName),
      title: normalizeDashboardText(planningClass.title),
      durationCode: normalizeDashboardText(planningClass.durationCode),
      durationLabel: normalizeDashboardText(planningClass.durationLabel),
      objectiveCode: normalizeDashboardText(planningClass.objectiveCode),
      objectiveTitle: normalizeDashboardText(planningClass.objectiveTitle),
      objectiveDescription: normalizeDashboardText(planningClass.objectiveDescription),
      evaluationType: normalizeDashboardText(planningClass.evaluationType) as PlanningClass['evaluationType'],
      startActivity: normalizeDashboardText(planningClass.startActivity),
      developmentActivity: normalizeDashboardText(planningClass.developmentActivity),
      closingActivity: normalizeDashboardText(planningClass.closingActivity),
      status: normalizeDashboardText(planningClass.status) as PlanningClass['status'],
      createdBy: normalizeDashboardText(planningClass.createdBy),
      documents: planningClass.documents.map((document) => this.normalizeDocument(document))
    };
  }

  private normalizeDocument(document: PlanningClassDocument): PlanningClassDocument {
    return {
      ...document,
      originalName: normalizeDashboardText(document.originalName),
      storedName: normalizeDashboardText(document.storedName),
      extension: normalizeDashboardText(document.extension),
      mimeType: normalizeDashboardText(document.mimeType),
      filePath: normalizeDashboardText(document.filePath),
      fileType: normalizeDashboardText(document.fileType) as PlanningDocumentFileType
    };
  }

  private normalizePlanningDocument(document: PlanningDocument): PlanningDocument {
    return {
      ...document,
      originalName: normalizeDashboardText(document.originalName),
      storedName: normalizeDashboardText(document.storedName),
      extension: normalizeDashboardText(document.extension),
      mimeType: normalizeDashboardText(document.mimeType),
      subjectName: normalizeDashboardText(document.subjectName),
      courseName: normalizeDashboardText(document.courseName),
      unitNumberLabel: normalizeDashboardText(document.unitNumberLabel),
      unitName: normalizeDashboardText(document.unitName),
      classTitle: normalizeDashboardText(document.classTitle),
      createdBy: normalizeDashboardText(document.createdBy)
    };
  }
}
