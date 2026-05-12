import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.config';
import { formatCourseLevelLabel, formatScheduleLabel } from '../constants/course-levels';
import {
  Course,
  CoursePayload,
  CourseSchedule,
  CreateCourseFromMasterPayload,
  MasterCourse,
  StudentCatalogItem,
  TeacherCatalogItem
} from '../models/course.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class CourseApiService {
  private readonly http = inject(HttpClient);

  findAll(): Observable<Course[]> {
    return this.http.get<Course[]>(`${API_CONFIG.baseUrl}/cursos`).pipe(
      map((courses) => courses.map((course) => ({
        ...course,
        code: normalizeDashboardText(course.code),
        name: normalizeDashboardText(course.name),
        level: formatCourseLevelLabel(normalizeDashboardText(course.level)),
        letter: normalizeDashboardText(course.letter),
        scheduleType: formatScheduleLabel(normalizeDashboardText(course.scheduleType)),
        teacherName: normalizeDashboardText(course.teacherName ?? ''),
        assistantName: normalizeDashboardText(course.assistantName ?? '')
      })))
    );
  }

  findById(courseId: number): Observable<Course> {
    return this.http.get<Course>(`${API_CONFIG.baseUrl}/cursos/${courseId}`).pipe(
      map((course) => ({
        ...course,
        code: normalizeDashboardText(course.code),
        name: normalizeDashboardText(course.name),
        level: formatCourseLevelLabel(normalizeDashboardText(course.level)),
        letter: normalizeDashboardText(course.letter),
        scheduleType: formatScheduleLabel(normalizeDashboardText(course.scheduleType)),
        teacherName: normalizeDashboardText(course.teacherName ?? ''),
        assistantName: normalizeDashboardText(course.assistantName ?? '')
      }))
    );
  }

  create(payload: CoursePayload): Observable<Course> {
    return this.http.post<Course>(`${API_CONFIG.baseUrl}/cursos`, payload);
  }

  createFromMaster(payload: CreateCourseFromMasterPayload): Observable<Course> {
    return this.http.post<Course>(`${API_CONFIG.baseUrl}/cursos/crear-desde-maestro`, payload);
  }

  update(courseId: number, payload: CoursePayload): Observable<Course> {
    return this.http.put<Course>(`${API_CONFIG.baseUrl}/cursos/${courseId}`, payload);
  }

  delete(courseId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/cursos/${courseId}`);
  }

  getSchedule(): Observable<CourseSchedule[]> {
    return this.http.get<CourseSchedule[]>(`${API_CONFIG.baseUrl}/horario`).pipe(
      map((items) => items.map((item) => ({
        ...item,
        courseName: normalizeDashboardText(item.courseName),
        teacherFullName: normalizeDashboardText(item.teacherFullName),
        dayOfWeek: normalizeDashboardText(item.dayOfWeek)
      })))
    );
  }

  searchMasterCourses(search: string): Observable<MasterCourse[]> {
    return this.http.get<MasterCourse[]>(`${API_CONFIG.baseUrl}/cursos-maestros`, {
      params: { search }
    }).pipe(
      map((courses) => courses.map((course) => ({
        ...course,
        code: normalizeDashboardText(course.code),
        description: normalizeDashboardText(course.description),
        level: formatCourseLevelLabel(normalizeDashboardText(course.level)),
        codeToken: normalizeDashboardText(course.codeToken)
      })))
    );
  }

  searchTeachers(search: string): Observable<TeacherCatalogItem[]> {
    return this.http.get<TeacherCatalogItem[]>(`${API_CONFIG.baseUrl}/profesores-catalogo`, {
      params: { search }
    }).pipe(
      map((teachers) => teachers.map((teacher) => ({
        ...teacher,
        staffType: normalizeDashboardText(teacher.staffType),
        firstName: normalizeDashboardText(teacher.firstName),
        lastName: normalizeDashboardText(teacher.lastName),
        fullName: normalizeDashboardText(teacher.fullName),
        address: normalizeDashboardText(teacher.address),
        regionName: normalizeDashboardText(teacher.regionName),
        communeName: normalizeDashboardText(teacher.communeName),
        email: normalizeDashboardText(teacher.email),
        subjects: teacher.subjects.map((subject) => normalizeDashboardText(subject))
      })))
    );
  }

  searchAvailableStudents(masterCourseId: number, search: string): Observable<StudentCatalogItem[]> {
    return this.http.get<StudentCatalogItem[]>(`${API_CONFIG.baseUrl}/alumnos/disponibles`, {
      params: { masterCourseId, search }
    }).pipe(map((students) => students.map((student) => this.normalizeStudent(student))));
  }

  searchAllUnassignedStudents(search: string): Observable<StudentCatalogItem[]> {
    return this.http.get<StudentCatalogItem[]>(`${API_CONFIG.baseUrl}/alumnos/universo`, {
      params: { search }
    }).pipe(map((students) => students.map((student) => this.normalizeStudent(student))));
  }

  private normalizeStudent(student: StudentCatalogItem): StudentCatalogItem {
    return {
      ...student,
      firstName: normalizeDashboardText(student.firstName),
      lastName: normalizeDashboardText(student.lastName),
      fullName: normalizeDashboardText(student.fullName),
      address: normalizeDashboardText(student.address),
      regionName: normalizeDashboardText(student.regionName),
      communeName: normalizeDashboardText(student.communeName)
    };
  }
}
