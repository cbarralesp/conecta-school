import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { formatCourseLevelLabel, formatScheduleLabel } from '../../../core/constants/course-levels';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CourseApiService } from '../../../core/services/course-api.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { Course, CoursePayload, MasterCourse, StudentCatalogItem, TeacherCatalogItem } from '../../../core/models/course.models';
import { EnrollmentListItem } from '../../../core/models/enrollment.models';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

@Component({
  selector: 'app-edit-course-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule,
    RouterLink,
    TeacherModernLayoutComponent
  ],
  templateUrl: './edit-course-page.component.html',
  styleUrl: './edit-course-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditCoursePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly courseApiService = inject(CourseApiService);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;
  readonly courseId = Number(this.route.snapshot.paramMap.get('id'));
  readonly course = signal<Course | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly selectedStudents = signal<StudentCatalogItem[]>([]);
  readonly teachers = signal<TeacherCatalogItem[]>([]);
  readonly assistants = signal<TeacherCatalogItem[]>([]);
  readonly masterCourses = signal<MasterCourse[]>([]);
  readonly studentSearch = signal('');
  readonly scheduleOptions = [
    { value: 'Mañana', label: 'Mañana' },
    { value: 'Tarde', label: 'Tarde' },
    { value: 'Completa', label: 'Completa' }
  ] as const;
  readonly levelOptions = computed(() => {
    const levels = new Map<string, number>();

    for (const course of this.masterCourses()) {
      if (!levels.has(course.level)) {
        levels.set(course.level, course.sortOrder);
      }
    }

    return Array.from(levels.entries())
      .sort((left, right) => left[1] - right[1])
      .map(([level]) => level);
  });

  readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required]],
    level: ['', [Validators.required]],
    letter: ['', [Validators.required]],
    schoolYear: [2026, [Validators.required, Validators.min(2020)]],
    scheduleType: ['Mañana', [Validators.required]],
    teacherId: [null as number | null, [Validators.required]],
    assistantId: [null as number | null]
  });

  readonly filteredSelectedStudents = computed(() => this.filterStudents(this.selectedStudents()));

  constructor() {
    this.loadPage();
  }

  getControlError(controlName: 'code' | 'name' | 'level' | 'letter' | 'schoolYear' | 'scheduleType' | 'teacherId'): string {
    const control = this.form.controls[controlName];
    if (!control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('min')) {
      return 'Ingresa un valor válido.';
    }
    return 'Revisa este campo.';
  }

  saveCourse(): void {
    const course = this.course();
    if (!course) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Completa los campos obligatorios para guardar el curso', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    if (this.isSaving()) {
      return;
    }

    const payload: CoursePayload = {
      ...this.form.getRawValue(),
      teacherId: this.form.controls.teacherId.value,
      assistantId: this.form.controls.assistantId.value,
      studentIds: this.selectedStudents().map((student) => student.id)
    };

    this.isSaving.set(true);
    this.courseApiService.update(course.id, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.snackBar.open('Curso actualizado correctamente', 'Cerrar', { duration: 2800 });
        void this.router.navigate(['/dashboard/cursos'], {
          queryParams: { refresh: Date.now() }
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(error, 'No fue posible actualizar el curso');
      }
    });
  }

  teacherOptionLabel(teacher: TeacherCatalogItem): string {
    const location = this.locationLabel(teacher.regionName, teacher.communeName);
    return location ? `${teacher.fullName} · ${location}` : teacher.fullName;
  }

  levelLabel(level: string): string {
    return formatCourseLevelLabel(level);
  }

  scheduleLabel(schedule: string): string {
    return formatScheduleLabel(schedule);
  }

  studentLocationLabel(student: StudentCatalogItem): string {
    return this.locationLabel(student.regionName, student.communeName);
  }

  private loadPage(): void {
    if (!Number.isFinite(this.courseId) || this.courseId <= 0) {
      this.isLoading.set(false);
      this.snackBar.open('Curso no válido', 'Cerrar', { duration: 3000 });
      void this.router.navigate(['/dashboard/cursos']);
      return;
    }

    this.isLoading.set(true);
    forkJoin({
      course: this.courseApiService.findById(this.courseId),
      enrolled: this.enrollmentApiService.getOverview({ courseId: this.courseId }),
      teachers: this.courseApiService.searchTeachers(''),
      masterCourses: this.courseApiService.searchMasterCourses('')
    }).subscribe({
      next: ({ course, enrolled, teachers, masterCourses }) => {
        this.course.set(course);
        this.teachers.set(this.resolveTeacherCatalog(teachers));
        this.assistants.set(this.resolveAssistantCatalog(teachers));
        this.masterCourses.set(masterCourses);
        this.form.patchValue({
          code: course.code,
          name: course.name,
          level: course.level,
          letter: course.letter,
          schoolYear: course.schoolYear,
          scheduleType: course.scheduleType,
          teacherId: course.teacherId ?? null,
          assistantId: course.assistantId ?? null
        });

        const selected = enrolled.enrollments
          .filter((item) => item.courseId === this.courseId)
          .map((item) => this.mapEnrollmentToStudent(item))
          .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));

        this.selectedStudents.set(selected);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el curso');
        void this.router.navigate(['/dashboard/cursos']);
      }
    });
  }

  private mapEnrollmentToStudent(enrollment: EnrollmentListItem): StudentCatalogItem {
    return {
      id: enrollment.studentId,
      run: enrollment.studentRun,
      firstName: enrollment.studentName,
      lastName: enrollment.studentLastName,
      fullName: enrollment.fullName,
      address: '',
      regionId: null,
      communeId: null,
      regionName: '',
      communeName: '',
      birthDate: '',
      age: 0
    };
  }

  private filterStudents(students: StudentCatalogItem[]): StudentCatalogItem[] {
    const query = this.studentSearch().trim().toLowerCase();
    if (!query) {
      return students;
    }

    return students.filter((student) =>
      student.fullName.toLowerCase().includes(query) || student.run.toLowerCase().includes(query)
    );
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }

  private locationLabel(regionName: string, communeName: string): string {
    const commune = communeName.trim();
    const region = regionName.trim();

    if (commune && region) {
      return `${commune}, ${region}`;
    }

    return commune || region;
  }

  private isTeacherStaff(item: TeacherCatalogItem): boolean {
    return (item.staffType || '').trim().toUpperCase() !== 'ASISTENTE';
  }

  private isAssistantStaff(item: TeacherCatalogItem): boolean {
    return (item.staffType || '').trim().toUpperCase() === 'ASISTENTE';
  }

  private resolveTeacherCatalog(items: TeacherCatalogItem[]): TeacherCatalogItem[] {
    const hasTypedStaff = items.some((item) => (item.staffType || '').trim().length > 0);
    return hasTypedStaff ? items.filter((item) => this.isTeacherStaff(item)) : items;
  }

  private resolveAssistantCatalog(items: TeacherCatalogItem[]): TeacherCatalogItem[] {
    const hasTypedStaff = items.some((item) => (item.staffType || '').trim().length > 0);
    return hasTypedStaff ? items.filter((item) => this.isAssistantStaff(item)) : items;
  }
}
