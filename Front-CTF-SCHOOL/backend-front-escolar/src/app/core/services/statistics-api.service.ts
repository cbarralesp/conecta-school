import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.config';
import { normalizeCourseDisplayName } from '../constants/course-levels';
import { AuthStateService } from './auth-state.service';
import { CourseApiService } from './course-api.service';
import { TeacherDashboardApiService } from './teacher-dashboard-api.service';
import { Course } from '../models/course.models';
import { TeacherDashboard } from '../models/teacher-dashboard.models';
import { StatisticsResponse } from '../models/statistics.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class StatisticsApiService {
  private readonly http = inject(HttpClient);
  private readonly authStateService = inject(AuthStateService);
  private readonly courseApiService = inject(CourseApiService);
  private readonly teacherDashboardApiService = inject(TeacherDashboardApiService);

  getStatistics(semester?: 1 | 2): Observable<StatisticsResponse> {
    const params = semester ? { semester } : undefined;

    return this.http.get<StatisticsResponse>(`${API_CONFIG.baseUrl}/teacher/statistics`, { params }).pipe(
      map((response) => this.normalizeResponse(response)),
      catchError(() => this.buildFallbackStatistics(semester))
    );
  }

  private normalizeResponse(response: StatisticsResponse): StatisticsResponse {
    return {
      ...response,
      periodLabel: normalizeDashboardText(response.periodLabel),
      chartLabels: (response.chartLabels ?? []).map((label) => normalizeDashboardText(label)),
      levels: (response.levels ?? []).map((level) => ({
        ...level,
        id: normalizeDashboardText(level.id).toLowerCase(),
        courses: (level.courses ?? []).map((course) => ({
          ...course,
          name: normalizeDashboardText(course.name),
          teacher: normalizeDashboardText(course.teacher),
          attendanceBreakdown: (course.attendanceBreakdown ?? []).map((item) => ({
            ...item,
            label: normalizeDashboardText(item.label),
            tone: normalizeDashboardText(item.tone).toLowerCase()
          }))
        }))
      }))
    };
  }

  private buildFallbackStatistics(semester?: 1 | 2): Observable<StatisticsResponse> {
    return forkJoin({
      courses: this.courseApiService.findAll().pipe(catchError(() => of([]))),
      dashboard: this.teacherDashboardApiService.getDashboard().pipe(catchError(() => of(null)))
    }).pipe(
      map(({ courses, dashboard }) => this.mapFallbackStatistics(courses, dashboard, semester))
    );
  }

  private mapFallbackStatistics(
    courses: Course[],
    dashboard: TeacherDashboard | null,
    semester?: 1 | 2
  ): StatisticsResponse {
    const currentYear = new Date().getFullYear();
    const currentSemester = semester ?? this.resolveCurrentSemester();
    const chartLabels = currentSemester === 1
      ? ['Mar', 'Abr', 'May', 'Jun']
      : ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const role = this.authStateService.user()?.rol ?? 'TEACHER';

    const activeCourses = courses.filter((course) => course.active);
    const yearCourses = activeCourses.filter((course) => course.schoolYear === currentYear);
    const sourceCourses = yearCourses.length ? yearCourses : activeCourses;
    const visibleCourses = role === 'ADMIN'
      ? sourceCourses
      : this.filterTeacherCourses(sourceCourses, dashboard);

    const levels = [
      { id: 'parvularia', courses: visibleCourses.filter((course) => this.resolveLevelId(course) === 'parvularia') },
      { id: 'basica', courses: visibleCourses.filter((course) => this.resolveLevelId(course) === 'basica') },
      { id: 'media', courses: visibleCourses.filter((course) => this.resolveLevelId(course) === 'media') }
    ]
      .filter((level) => level.courses.length > 0)
      .map((level) => ({
        id: level.id,
        courses: level.courses.map((course) => ({
          id: course.id,
          name: normalizeDashboardText(normalizeCourseDisplayName(course.name, course.letter)),
          students: course.studentCount ?? 0,
          teacher: normalizeDashboardText(course.teacherName ?? dashboard?.teacherName ?? 'Sin docente asignado'),
          averageAttendance: 0,
          averageGrade: 0,
          planningProgress: 0,
          annotations: 0,
          annotationDelta: 0,
          attendanceDelta: 0,
          gradeDelta: 0,
          planningDelta: 0,
          attendanceBreakdown: [
            { label: 'Presentes', value: 0, tone: 'green' },
            { label: 'Ausentes', value: 0, tone: 'blue' },
            { label: 'Atrasos', value: 0, tone: 'cyan' }
          ],
          attendanceSeries: chartLabels.map(() => 0),
          gradeSeries: chartLabels.map(() => null),
          planningSeries: chartLabels.map(() => 0),
          planningSummary: {
            completed: 0,
            inProgress: 0,
            pending: 0
          },
          annotationSeries: chartLabels.map(() => 0),
          evaluationsCount: 0,
          publishedActivitiesCount: 0,
          sharedResourcesCount: 0,
          standoutStudentsCount: 0
        }))
      }));

    return {
      periodLabel: currentSemester === 1 ? 'Primer semestre' : 'Segundo semestre',
      chartLabels,
      levels
    };
  }

  private resolveCurrentSemester(): 1 | 2 {
    const currentMonth = new Date().getMonth() + 1;
    return currentMonth >= 7 ? 2 : 1;
  }

  private filterTeacherCourses(courses: Course[], dashboard: TeacherDashboard | null): Course[] {
    if (!dashboard?.assignedCourses?.length) {
      return courses;
    }

    const allowedNames = new Set(
      dashboard.assignedCourses
        .map((course) => normalizeDashboardText(course.courseName).trim().toLowerCase())
        .filter((name) => name.length > 0)
    );
    const filteredCourses = courses.filter((course) => {
      const displayName = normalizeDashboardText(normalizeCourseDisplayName(course.name, course.letter)).trim().toLowerCase();
      const rawName = normalizeDashboardText(course.name).trim().toLowerCase();
      return allowedNames.has(displayName) || allowedNames.has(rawName);
    });

    return filteredCourses.length ? filteredCourses : courses;
  }

  private resolveLevelId(course: Course): 'parvularia' | 'basica' | 'media' {
    const label = normalizeDashboardText(`${course.level} ${course.name} ${course.code}`)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (label.includes('prekinder') || label.includes('kinder') || /\bpk\b/.test(label)) {
      return 'parvularia';
    }
    if (/(^|\s)(7|8)\s*basico\b/.test(label) || label.includes('medio')) {
      return 'media';
    }
    return 'basica';
  }
}
