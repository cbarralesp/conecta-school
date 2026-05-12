import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { formatCourseLevelLabel, formatScheduleLabel } from '../../../core/constants/course-levels';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CourseApiService } from '../../../core/services/course-api.service';
import {
  MasterCourse,
  StudentCatalogItem,
  TeacherCatalogItem
} from '../../../core/models/course.models';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

@Component({
  selector: 'app-create-course-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatSelectModule,
    RouterLink,
    TeacherModernLayoutComponent
  ],
  templateUrl: './create-course-page.component.html',
  styleUrl: './create-course-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateCoursePageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly courseApiService = inject(CourseApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly user = this.authStateService.user;
  readonly masterCourses = signal<MasterCourse[]>([]);
  readonly selectedMasterCourse = signal<MasterCourse | null>(null);
  readonly teachers = signal<TeacherCatalogItem[]>([]);
  readonly assistants = signal<TeacherCatalogItem[]>([]);
  readonly availableStudents = signal<StudentCatalogItem[]>([]);
  readonly selectedStudents = signal<StudentCatalogItem[]>([]);
  readonly selectedTeacher = signal<TeacherCatalogItem | null>(null);
  readonly selectedAssistant = signal<TeacherCatalogItem | null>(null);
  readonly isSaving = signal(false);
  readonly isSearching = signal(false);
  readonly isSearchingTeachers = signal(false);
  readonly isSearchingAssistants = signal(false);
  readonly isLoadingStudents = signal(false);
  readonly currentStep = signal<'configuration' | 'students'>('configuration');
  readonly checkedAvailableIds = signal<number[]>([]);
  readonly checkedSelectedIds = signal<number[]>([]);
  readonly addAllArmed = signal(false);
  readonly schoolYears = [2026, 2027, 2028];
  readonly parallelOptions = ['A', 'B', 'C', 'D', 'E', 'F'];
  readonly scheduleOptions = [
    { value: 'Mañana', label: 'Mañana' },
    { value: 'Tarde', label: 'Tarde' },
    { value: 'Completa', label: 'Completa' }
  ] as const;

  readonly form = this.formBuilder.nonNullable.group({
    courseSearch: ['' as string | MasterCourse, [Validators.required]],
    levelSearch: ['', [Validators.required]],
    parallel: ['A', [Validators.required]],
    schoolYear: [2026, [Validators.required, Validators.min(2020)]],
    scheduleType: ['Mañana', [Validators.required]],
    teacherSearch: ['' as string | TeacherCatalogItem, [Validators.required]],
    assistantSearch: ['' as string | TeacherCatalogItem]
  });

  readonly generatedCodePreview = computed(() => {
    const master = this.selectedMasterCourse();
    const year = this.form.controls.schoolYear.value;
    return master ? `${master.codeToken}${this.parallelPreview()}-${year}` : '-';
  });

  readonly parallelPreview = computed(() => this.form.controls.parallel.value || 'A');

  readonly selectedCourseTitle = computed(() => {
    const masterCourse = this.selectedMasterCourse();
    if (!masterCourse) {
      return 'Curso sin definir';
    }

    return `${masterCourse.description} ${this.parallelPreview()}`;
  });

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

  readonly masterCourseOptions = computed(() =>
    [...this.masterCourses()].sort((left, right) =>
      left.sortOrder - right.sortOrder || left.description.localeCompare(right.description, 'es')
    )
  );

  readonly filteredMasterCourseOptions = computed(() => {
    const selectedLevel = this.form.controls.levelSearch.value;
    if (!selectedLevel) {
      return this.masterCourseOptions();
    }

    return this.masterCourseOptions().filter((course) => course.level === selectedLevel);
  });

  readonly availableCount = computed(() => this.availableStudents().length);
  readonly selectedCount = computed(() => this.selectedStudents().length);

  constructor() {
    this.searchMasterCourses('');
    this.searchTeachers('');
    this.searchAssistants('');
  }

  getControlError(controlName: 'courseSearch' | 'levelSearch' | 'parallel' | 'schoolYear' | 'scheduleType' | 'teacherSearch'): string {
    const control = this.form.controls[controlName];
    if (!control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('min')) {
      return 'Ingresa un valor valido.';
    }
    return 'Revisa este campo.';
  }

  selectLevel(level: string): void {
    this.form.controls.levelSearch.setValue(level, { emitEvent: false });
    this.form.controls.levelSearch.markAsTouched();

    const selectedCourse = this.selectedMasterCourse();
    if (selectedCourse && selectedCourse.level !== level) {
      this.selectMasterCourse(null);
    }
  }

  selectMasterCourse(masterCourse: MasterCourse | null): void {
    if (this.selectedMasterCourse()?.id !== masterCourse?.id) {
      this.availableStudents.set([]);
      this.selectedStudents.set([]);
      this.checkedAvailableIds.set([]);
      this.checkedSelectedIds.set([]);
      this.addAllArmed.set(false);
    }

    this.selectedMasterCourse.set(masterCourse);
    this.form.controls.courseSearch.setValue(masterCourse ?? '', { emitEvent: false });
    this.form.controls.courseSearch.markAsTouched();

    if (masterCourse) {
      this.form.controls.levelSearch.setValue(masterCourse.level, { emitEvent: false });
    }
  }

  selectTeacher(teacher: TeacherCatalogItem | null): void {
    this.selectedTeacher.set(teacher);
    this.form.controls.teacherSearch.setValue(teacher ?? '', { emitEvent: false });
    this.form.controls.teacherSearch.markAsTouched();
  }

  selectAssistant(assistant: TeacherCatalogItem | null): void {
    this.selectedAssistant.set(assistant);
    this.form.controls.assistantSearch.setValue(assistant ?? '', { emitEvent: false });
  }

  goToAssignmentStep(): void {
    const masterCourse = this.selectedMasterCourse();
    const teacher = this.selectedTeacher();

    if (!masterCourse) {
      this.form.controls.courseSearch.markAsTouched();
      this.snackBar.open('Selecciona un curso maestro antes de continuar', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    if (!teacher) {
      this.form.controls.teacherSearch.markAsTouched();
      this.snackBar.open('Selecciona un profesor jefe para crear el curso', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Completa los datos obligatorios para avanzar', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    this.loadAvailableStudents(masterCourse.id);
  }

  backToConfiguration(): void {
    this.currentStep.set('configuration');
    this.addAllArmed.set(false);
  }

  toggleAvailableStudent(studentId: number): void {
    this.addAllArmed.set(false);
    this.checkedAvailableIds.update((ids) =>
      ids.includes(studentId) ? ids.filter((id) => id !== studentId) : [...ids, studentId]
    );
  }

  toggleSelectedStudent(studentId: number): void {
    this.checkedSelectedIds.update((ids) =>
      ids.includes(studentId) ? ids.filter((id) => id !== studentId) : [...ids, studentId]
    );
  }

  moveCheckedToSelected(): void {
    const selectedIds = new Set(this.checkedAvailableIds());
    if (selectedIds.size) {
      const moving = this.availableStudents().filter((student) => selectedIds.has(student.id));
      this.availableStudents.update((current) => current.filter((student) => !selectedIds.has(student.id)));
      this.selectedStudents.update((current) => [...current, ...moving]);
      this.checkedAvailableIds.set([]);
      this.addAllArmed.set(false);
      return;
    }

    if (this.availableStudents().length === 0) {
      return;
    }

    if (!this.addAllArmed()) {
      this.addAllArmed.set(true);
      this.snackBar.open('Selecciona un alumno o presiona nuevamente para agregar todos', 'Cerrar', {
        duration: 2200
      });
      return;
    }

    this.selectedStudents.update((current) => [...current, ...this.availableStudents()]);
    this.availableStudents.set([]);
    this.checkedAvailableIds.set([]);
    this.addAllArmed.set(false);
  }

  moveCheckedToAvailable(): void {
    const selectedIds = new Set(this.checkedSelectedIds());
    if (!selectedIds.size) {
      return;
    }

    const moving = this.selectedStudents().filter((student) => selectedIds.has(student.id));
    this.selectedStudents.update((current) => current.filter((student) => !selectedIds.has(student.id)));
    this.availableStudents.update((current) => [...current, ...moving]);
    this.checkedSelectedIds.set([]);
  }

  createCourse(): void {
    const masterCourse = this.selectedMasterCourse();
    const teacher = this.selectedTeacher();
    const assistant = this.selectedAssistant();
    if (this.isSaving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Completa los campos obligatorios para crear el curso', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    if (!masterCourse || !teacher) {
      this.snackBar.open('Vuelve al paso anterior y completa los datos del curso', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    this.isSaving.set(true);
    this.courseApiService
      .createFromMaster({
        masterCourseId: masterCourse.id,
        parallel: this.form.controls.parallel.value,
        schoolYear: this.form.controls.schoolYear.value,
        scheduleType: this.form.controls.scheduleType.value,
        teacherId: teacher.id,
        assistantId: assistant?.id ?? null,
        studentIds: this.selectedStudents().map((student) => student.id)
      })
      .subscribe({
        next: (course) => {
          this.isSaving.set(false);
          this.snackBar.open(`Curso ${course.name} creado correctamente`, 'Cerrar', { duration: 3000 });
          void this.router.navigate(['/dashboard/cursos']);
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.snackBar.open(
            typeof error.error?.message === 'string'
              ? error.error.message
              : 'No fue posible crear el curso',
            'Cerrar',
            { duration: 3500 }
          );
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

  private loadAvailableStudents(masterCourseId: number): void {
    this.isLoadingStudents.set(true);
    this.courseApiService.searchAvailableStudents(masterCourseId, '').subscribe({
      next: (students) => {
        this.availableStudents.set(students);
        this.selectedStudents.set([]);
        this.checkedAvailableIds.set([]);
        this.checkedSelectedIds.set([]);
        this.addAllArmed.set(false);
        this.currentStep.set('students');
        this.isLoadingStudents.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.availableStudents.set([]);
        this.selectedStudents.set([]);
        this.checkedAvailableIds.set([]);
        this.checkedSelectedIds.set([]);
        this.addAllArmed.set(false);
        this.isLoadingStudents.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'No fue posible cargar los alumnos disponibles',
          'Cerrar',
          { duration: 3500 }
        );
      }
    });
  }

  private searchMasterCourses(search: string): void {
    this.isSearching.set(true);
    this.courseApiService.searchMasterCourses(search).subscribe({
      next: (courses) => {
        this.masterCourses.set(courses);
        this.isSearching.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.masterCourses.set([]);
        this.isSearching.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'No fue posible cargar los cursos maestros. Reinicia el backend si aun no lo has hecho.',
          'Cerrar',
          { duration: 4500 }
        );
      }
    });
  }

  private searchTeachers(search: string): void {
    this.isSearchingTeachers.set(true);
    this.courseApiService.searchTeachers(search).subscribe({
      next: (teachers) => {
        this.teachers.set(this.resolveTeacherCatalog(teachers));
        this.isSearchingTeachers.set(false);
      },
      error: () => {
        this.teachers.set([]);
        this.isSearchingTeachers.set(false);
      }
    });
  }

  private searchAssistants(search: string): void {
    this.isSearchingAssistants.set(true);
    this.courseApiService.searchTeachers(search).subscribe({
      next: (teachers) => {
        this.assistants.set(this.resolveAssistantCatalog(teachers));
        this.isSearchingAssistants.set(false);
      },
      error: () => {
        this.assistants.set([]);
        this.isSearchingAssistants.set(false);
      }
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
