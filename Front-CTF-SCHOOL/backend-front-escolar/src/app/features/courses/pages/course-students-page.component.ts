import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { catchError, forkJoin, of } from 'rxjs';
import { Course } from '../../../core/models/course.models';
import { EnrollmentDetail, EnrollmentListItem } from '../../../core/models/enrollment.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import { CourseApiService } from '../../../core/services/course-api.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { GradeApiService } from '../../../core/services/grade-api.service';
import { SummaryMetricCardComponent } from '../../../shared/summary-metric-card.component';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

interface CourseStudentView extends EnrollmentListItem {
  guardianPhone: string;
  guardianEmail: string;
  attendancePercentage: number | null;
  overallAverage: number | null;
  active: boolean;
}

@Component({
  selector: 'app-course-students-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule,
    RouterLink,
    SummaryMetricCardComponent,
    TeacherModernLayoutComponent
  ],
  templateUrl: './course-students-page.component.html',
  styleUrl: './course-students-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseStudentsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly courseApiService = inject(CourseApiService);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  private readonly attendanceApiService = inject(AttendanceApiService);
  private readonly gradeApiService = inject(GradeApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;
  readonly courseId = Number(this.route.snapshot.paramMap.get('id'));
  readonly displayedColumns = ['student', 'guardian', 'contact', 'attendance', 'average', 'status', 'actions'];
  readonly course = signal<Course | null>(null);
  readonly enrollments = signal<CourseStudentView[]>([]);
  readonly search = signal('');
  readonly isLoading = signal(true);

  readonly filteredEnrollments = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) {
      return this.enrollments();
    }

    return this.enrollments().filter((enrollment) =>
      enrollment.fullName.toLowerCase().includes(query) ||
      enrollment.studentRun.toLowerCase().includes(query) ||
      enrollment.guardianFullName.toLowerCase().includes(query) ||
      enrollment.guardianPhone.toLowerCase().includes(query) ||
      enrollment.guardianEmail.toLowerCase().includes(query)
    );
  });

  readonly totalStudents = computed(() => this.enrollments().length);
  readonly activeStudents = computed(() => this.enrollments().filter((item) => item.active).length);
  readonly guardiansRegistered = computed(() =>
    this.enrollments().filter((item) => item.guardianFullName.trim().length > 0).length
  );
  readonly averageAttendance = computed(() => {
    const values = this.enrollments()
      .map((item) => item.attendancePercentage)
      .filter((value): value is number => value != null);
    if (!values.length) {
      return null;
    }
    return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
  });

  readonly summaryCards = computed(() => [
    { label: 'Total alumnos', value: this.totalStudents(), icon: 'groups', tone: 'blue' },
    { label: 'Activos', value: this.activeStudents(), icon: 'verified_user', tone: 'green' },
    { label: 'Con apoderado registrado', value: this.guardiansRegistered(), icon: 'supervisor_account', tone: 'violet' },
    { label: 'Promedio asistencia', value: this.averageAttendance() == null ? '—' : `${this.averageAttendance()}%`, icon: 'monitoring', tone: 'amber' }
  ]);

  constructor() {
    this.loadPage();
  }

  requestDelete(enrollment: EnrollmentListItem): void {
    const ref = this.snackBar.open(
      `Quitar a ${enrollment.fullName} de ${this.course()?.name ?? 'este curso'}?`,
      'Confirmar',
      { duration: 5000 }
    );

    ref.onAction().subscribe(() => {
      this.enrollmentApiService.delete(enrollment.id).subscribe({
        next: () => {
          this.enrollments.update((items) => items.filter((item) => item.id !== enrollment.id));
          this.snackBar.open('Alumno eliminado del curso correctamente', 'Cerrar', { duration: 2600 });
        },
        error: (error: HttpErrorResponse) => {
          this.showError(error, 'No fue posible eliminar el alumno del curso');
        }
      });
    });
  }

  formatDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  initials(fullName: string): string {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  formatAttendance(value: number | null): string {
    return value == null ? '—' : `${Math.round(value)}%`;
  }

  formatAverage(value: number | null): string {
    return value == null ? '—' : value.toFixed(1);
  }

  hasContact(enrollment: CourseStudentView): boolean {
    return enrollment.guardianPhone.trim().length > 0 || enrollment.guardianEmail.trim().length > 0;
  }

  private loadPage(): void {
    if (!Number.isFinite(this.courseId) || this.courseId <= 0) {
      this.isLoading.set(false);
      this.snackBar.open('Curso no valido', 'Cerrar', { duration: 3000 });
      void this.router.navigate(['/dashboard/cursos']);
      return;
    }

    this.isLoading.set(true);
    forkJoin({
      course: this.courseApiService.findById(this.courseId),
      overview: this.enrollmentApiService.getOverview({ courseId: this.courseId })
    }).subscribe({
      next: ({ course, overview }) => {
        this.course.set(course);
        const scopedEnrollments = overview.enrollments.filter((enrollment) => enrollment.courseId === this.courseId);
        this.loadStudentData(course, scopedEnrollments);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar los alumnos del curso');
        void this.router.navigate(['/dashboard/cursos']);
      }
    });
  }

  private loadStudentData(course: Course, enrollments: EnrollmentListItem[]): void {
    if (enrollments.length === 0) {
      this.enrollments.set([]);
      this.isLoading.set(false);
      return;
    }

    const semester = this.resolveCurrentSemester();
    const currentPeriod$ = this.gradeApiService.getCatalog().pipe(
      catchError(() => of({ courses: [], periods: [] })),
      of
    );

    forkJoin({
      details: forkJoin(
        enrollments.map((enrollment) =>
          this.enrollmentApiService.getById(enrollment.id).pipe(catchError(() => of(null as EnrollmentDetail | null)))
        )
      ),
      gradeCatalog: this.gradeApiService.getCatalog().pipe(catchError(() => of({ courses: [], periods: [] }))),
      attendance: forkJoin(
        enrollments.map((enrollment) =>
          this.attendanceApiService
            .getStudentSummary(course.id, enrollment.studentId, course.schoolYear, semester)
            .pipe(catchError(() => of(null)))
        )
      )
    }).subscribe({
      next: ({ details, gradeCatalog, attendance }) => {
        const period = gradeCatalog.periods.find(
          (item) => item.schoolYear === course.schoolYear && item.semester === semester
        );

        if (!period) {
          this.hydrateStudents(enrollments, details, attendance, []);
          return;
        }

        this.gradeApiService.getStudentProfile(course.id, period.id).pipe(catchError(() => of(null))).subscribe({
          next: (profile) => {
            this.hydrateStudents(enrollments, details, attendance, profile?.students ?? []);
          },
          error: () => {
            this.hydrateStudents(enrollments, details, attendance, []);
          }
        });
      },
      error: () => {
        this.enrollments.set(enrollments.map((item) => this.toStudentView(item)));
        this.isLoading.set(false);
      }
    });
  }

  private hydrateStudents(
    enrollments: EnrollmentListItem[],
    details: Array<EnrollmentDetail | null>,
    attendance: Array<{ percentage: number } | null>,
    studentGrades: Array<{ studentId: number; overallAverage: number | null }>
  ): void {
    const detailsMap = new Map<number, EnrollmentDetail>();
    details.forEach((detail) => {
      if (detail) {
        detailsMap.set(detail.id, detail);
      }
    });

    const attendanceMap = new Map<number, number | null>();
    attendance.forEach((summary, index) => {
      attendanceMap.set(enrollments[index].studentId, summary?.percentage ?? null);
    });

    const gradesMap = new Map<number, number | null>();
    studentGrades.forEach((student) => {
      gradesMap.set(student.studentId, student.overallAverage);
    });

    this.enrollments.set(
      enrollments.map((enrollment) => {
        const detail = detailsMap.get(enrollment.id);
        return {
          ...this.toStudentView(enrollment),
          guardianPhone: detail?.guardian.phone ?? '',
          guardianEmail: detail?.guardian.email ?? '',
          attendancePercentage: attendanceMap.get(enrollment.studentId) ?? null,
          overallAverage: gradesMap.get(enrollment.studentId) ?? null
        };
      })
    );
    this.isLoading.set(false);
  }

  private toStudentView(enrollment: EnrollmentListItem): CourseStudentView {
    return {
      ...enrollment,
      guardianPhone: '',
      guardianEmail: '',
      attendancePercentage: null,
      overallAverage: null,
      active: enrollment.status.trim().toUpperCase() === 'ACTIVO'
    };
  }

  private resolveCurrentSemester(): number {
    const month = new Date().getMonth() + 1;
    return month >= 8 ? 2 : 1;
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}

