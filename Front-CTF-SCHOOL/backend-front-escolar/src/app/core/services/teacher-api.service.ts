import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.config';
import { TeacherAccessPreview, TeacherAccessPreviewPayload, TeacherAssignedCourse, TeacherDetail, TeacherOverview, TeacherPayload, TeacherSystemAccess } from '../models/teacher.models';
import { Subject } from '../models/subject.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class TeacherApiService {
  private readonly http = inject(HttpClient);

  getOverview(filters?: { search?: string; subjectId?: number | null; status?: string | null }): Observable<TeacherOverview> {
    let params = new HttpParams();
    if (filters?.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters?.subjectId) {
      params = params.set('subjectId', filters.subjectId);
    }
    if (filters?.status?.trim()) {
      params = params.set('status', filters.status.trim());
    }

    return this.http.get<TeacherOverview>(`${API_CONFIG.baseUrl}/profesores`, { params }).pipe(
      map((overview) => this.normalizeOverview(overview))
    );
  }

  getById(teacherId: number): Observable<TeacherDetail> {
    return this.http.get<TeacherDetail>(`${API_CONFIG.baseUrl}/profesores/${teacherId}`).pipe(
      map((teacher) => this.normalizeDetail(teacher))
    );
  }

  create(payload: TeacherPayload): Observable<TeacherDetail> {
    return this.http.post<TeacherDetail>(`${API_CONFIG.baseUrl}/profesores`, payload).pipe(
      map((teacher) => this.normalizeDetail(teacher))
    );
  }

  previewSystemAccessUsername(payload: TeacherAccessPreviewPayload): Observable<TeacherAccessPreview> {
    return this.http.post<TeacherAccessPreview>(`${API_CONFIG.baseUrl}/profesores/access-preview`, payload).pipe(
      map((preview) => ({
        username: normalizeDashboardText(preview.username ?? '')
      }))
    );
  }

  update(teacherId: number, payload: TeacherPayload): Observable<TeacherDetail> {
    return this.http.put<TeacherDetail>(`${API_CONFIG.baseUrl}/profesores/${teacherId}`, payload).pipe(
      map((teacher) => this.normalizeDetail(teacher))
    );
  }

  delete(teacherId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/profesores/${teacherId}`);
  }

  private normalizeOverview(overview: TeacherOverview): TeacherOverview {
    return {
      ...overview,
      subjects: overview.subjects.map((subject) => this.normalizeSubject(subject)),
      teachers: overview.teachers.map((teacher) => ({
        ...teacher,
        staffType: normalizeDashboardText(teacher.staffType),
        fullName: normalizeDashboardText(teacher.fullName),
        professionalTitle: normalizeDashboardText(teacher.professionalTitle),
        contractType: normalizeDashboardText(teacher.contractType),
        employmentStatus: normalizeDashboardText(teacher.employmentStatus),
        subjects: teacher.subjects.map((subject) => this.normalizeSubject(subject)),
        assignedCourses: teacher.assignedCourses.map((course) => normalizeDashboardText(course))
      }))
    };
  }

  private normalizeDetail(teacher: TeacherDetail): TeacherDetail {
    return {
      ...teacher,
      staffType: normalizeDashboardText(teacher.staffType),
      firstNames: normalizeDashboardText(teacher.firstNames),
      paternalLastName: normalizeDashboardText(teacher.paternalLastName),
      maternalLastName: normalizeDashboardText(teacher.maternalLastName),
      fullName: normalizeDashboardText(teacher.fullName),
      gender: normalizeDashboardText(teacher.gender),
      address: normalizeDashboardText(teacher.address),
      professionalTitle: normalizeDashboardText(teacher.professionalTitle),
      contractType: normalizeDashboardText(teacher.contractType),
      employmentStatus: normalizeDashboardText(teacher.employmentStatus),
      subjects: teacher.subjects.map((subject) => this.normalizeSubject(subject)),
      assignedCourses: teacher.assignedCourses.map((course) => this.normalizeAssignedCourse(course)),
      weeklySchedule: teacher.weeklySchedule.map((item) => ({
        ...item,
        dayOfWeek: normalizeDashboardText(item.dayOfWeek),
        courseName: normalizeDashboardText(item.courseName),
        subjectName: normalizeDashboardText(item.subjectName),
        room: normalizeDashboardText(item.room)
      })),
      emergencyContact: {
        ...teacher.emergencyContact,
        fullName: normalizeDashboardText(teacher.emergencyContact.fullName),
        relation: normalizeDashboardText(teacher.emergencyContact.relation)
      },
      systemAccess: this.normalizeSystemAccess(teacher.systemAccess)
    };
  }

  private normalizeSubject(subject: Subject): Subject {
    return {
      ...subject,
      name: normalizeDashboardText(subject.name),
      area: normalizeDashboardText(subject.area),
      description: normalizeDashboardText(subject.description),
      referenceLevel: normalizeDashboardText(subject.referenceLevel)
    };
  }

  private normalizeAssignedCourse(course: TeacherAssignedCourse): TeacherAssignedCourse {
    return {
      ...course,
      courseName: normalizeDashboardText(course.courseName),
      courseCode: normalizeDashboardText(course.courseCode),
      subjectName: normalizeDashboardText(course.subjectName)
    };
  }

  private normalizeSystemAccess(access: TeacherSystemAccess | null | undefined): TeacherSystemAccess {
    return {
      configureAccess: !!access?.configureAccess,
      createAccount: !!access?.createAccount,
      username: access?.username?.trim() ?? '',
      temporaryPassword: '',
      notifyByEmail: !!access?.notifyByEmail,
      contactEmail: access?.contactEmail?.trim() ?? '',
      status: normalizeDashboardText(access?.status ?? 'Sin cuenta')
    };
  }
}
