import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
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
  readonly isSearchingStudents = signal(false);
  readonly isSearchingUniverseStudents = signal(false);
  readonly availableStudentFilter = signal('');
  readonly universeStudentFilter = signal('');
  readonly universeStudents = signal<StudentCatalogItem[]>([]);
  readonly checkedAvailableIds = signal<number[]>([]);
  readonly checkedSelectedIds = signal<number[]>([]);

  readonly form = this.formBuilder.nonNullable.group({
    courseSearch: ['' as string | MasterCourse, [Validators.required]],
    schoolYear: [2026, [Validators.required, Validators.min(2020)]],
    scheduleType: ['Manana', [Validators.required]],
    teacherSearch: ['' as string | TeacherCatalogItem, [Validators.required]],
    assistantSearch: ['' as string | TeacherCatalogItem]
  });

  readonly generatedCodePreview = computed(() => {
    const master = this.selectedMasterCourse();
    const year = this.form.controls.schoolYear.value;
    return master ? `${this.normalizeMasterCourseCode(master.code)}-${year}` : '-';
  });

  readonly filteredAvailableStudents = computed(() => {
    const filter = this.availableStudentFilter().trim().toUpperCase();
    const selectedIds = new Set(this.selectedStudents().map((student) => student.id));
    return this.availableStudents()
      .filter((student) => !selectedIds.has(student.id))
      .filter((student) => {
        if (!filter) {
          return true;
        }
        const haystack = `${student.fullName} ${student.run}`.toUpperCase();
        return haystack.includes(filter);
      });
  });

  readonly visibleUniverseStudents = computed(() => {
    const selectedIds = new Set(this.selectedStudents().map((student) => student.id));
    return this.universeStudents().filter((student) => !selectedIds.has(student.id));
  });

  constructor() {
    this.form.controls.courseSearch.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((value) => {
        if (typeof value !== 'string') {
          this.selectedMasterCourse.set(value);
          this.loadAvailableStudents();
          return;
        }

        this.selectedMasterCourse.set(null);
        this.availableStudents.set([]);
        this.selectedStudents.set([]);
        this.checkedAvailableIds.set([]);
        this.checkedSelectedIds.set([]);
        this.searchMasterCourses(value);
      });

    this.searchMasterCourses('');

    this.form.controls.teacherSearch.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((value) => {
        if (typeof value !== 'string') {
          this.selectedTeacher.set(value);
          return;
        }

        this.selectedTeacher.set(null);
        this.searchTeachers(value);
      });

    this.form.controls.assistantSearch.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((value) => {
        if (typeof value !== 'string') {
          this.selectedAssistant.set(value);
          return;
        }

        this.selectedAssistant.set(null);
        this.searchAssistants(value);
      });

    this.searchTeachers('');
    this.searchAssistants('');
  }

  displayCourse(masterCourse: MasterCourse | string | null): string {
    if (!masterCourse) {
      return '';
    }
    return typeof masterCourse === 'string'
      ? masterCourse
      : `${masterCourse.code} - ${masterCourse.description}`;
  }

  selectMasterCourse(event: MatAutocompleteSelectedEvent): void {
    const masterCourse = event.option.value as MasterCourse;
    this.selectedMasterCourse.set(masterCourse);
    this.form.controls.courseSearch.setValue(masterCourse, { emitEvent: false });
    this.loadAvailableStudents();
  }

  displayTeacher(teacher: TeacherCatalogItem | string | null): string {
    if (!teacher) {
      return '';
    }
    return typeof teacher === 'string' ? teacher : `${teacher.fullName} - ${teacher.rud}`;
  }

  selectTeacher(event: MatAutocompleteSelectedEvent): void {
    const teacher = event.option.value as TeacherCatalogItem;
    this.selectedTeacher.set(teacher);
    this.form.controls.teacherSearch.setValue(teacher, { emitEvent: false });
  }

  selectAssistant(event: MatAutocompleteSelectedEvent): void {
    const assistant = event.option.value as TeacherCatalogItem;
    this.selectedAssistant.set(assistant);
    this.form.controls.assistantSearch.setValue(assistant, { emitEvent: false });
  }

  clearMasterCourse(): void {
    this.selectedMasterCourse.set(null);
    this.availableStudents.set([]);
    this.selectedStudents.set([]);
    this.checkedAvailableIds.set([]);
    this.checkedSelectedIds.set([]);
    this.form.controls.courseSearch.setValue('', { emitEvent: true });
  }

  clearTeacher(): void {
    this.selectedTeacher.set(null);
    this.form.controls.teacherSearch.setValue('', { emitEvent: true });
  }

  clearAssistant(): void {
    this.selectedAssistant.set(null);
    this.form.controls.assistantSearch.setValue('', { emitEvent: true });
  }

  createCourse(): void {
    const masterCourse = this.selectedMasterCourse();
    const teacher = this.selectedTeacher();
    const assistant = this.selectedAssistant();
    if (this.isSaving()) {
      return;
    }

    if (!masterCourse) {
      this.form.controls.courseSearch.markAsTouched();
      this.snackBar.open('Selecciona un curso maestro antes de continuar', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    if (!teacher) {
      this.form.controls.teacherSearch.markAsTouched();
      this.snackBar.open('Selecciona un profesor para crear el curso', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Completa los datos obligatorios del formulario', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    this.isSaving.set(true);
    this.courseApiService
      .createFromMaster({
        masterCourseId: masterCourse.id,
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

  toggleAvailableStudent(studentId: number, checked: boolean): void {
    this.checkedAvailableIds.update((ids) =>
      checked ? [...ids, studentId] : ids.filter((id) => id !== studentId)
    );
  }

  toggleSelectedStudent(studentId: number, checked: boolean): void {
    this.checkedSelectedIds.update((ids) =>
      checked ? [...ids, studentId] : ids.filter((id) => id !== studentId)
    );
  }

  moveSelectedStudents(): void {
    const selectedIds = new Set(this.checkedAvailableIds());
    const studentsToMove = this.filteredAvailableStudents().filter((student) => selectedIds.has(student.id));
    this.selectedStudents.update((current) => [...current, ...studentsToMove.filter((student) => !current.some((item) => item.id === student.id))]);
    this.checkedAvailableIds.set([]);
  }

  removeSelectedStudents(): void {
    const selectedIds = new Set(this.checkedSelectedIds());
    this.selectedStudents.update((current) => current.filter((student) => !selectedIds.has(student.id)));
    this.checkedSelectedIds.set([]);
  }

  setAvailableStudentFilter(value: string): void {
    this.availableStudentFilter.set(value);
    if (value.trim()) {
      this.searchUniverseStudents(value);
    } else {
      this.universeStudents.set([]);
      this.universeStudentFilter.set('');
    }
  }

  setUniverseStudentFilter(value: string): void {
    this.universeStudentFilter.set(value);
    this.searchUniverseStudents(value);
  }

  addStudentFromUniverse(student: StudentCatalogItem): void {
    this.selectedStudents.update((current) =>
      current.some((item) => item.id === student.id) ? current : [...current, student]
    );
    this.universeStudents.update((current) => current.filter((item) => item.id !== student.id));
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
        this.teachers.set(teachers);
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
        this.assistants.set(teachers);
        this.isSearchingAssistants.set(false);
      },
      error: () => {
        this.assistants.set([]);
        this.isSearchingAssistants.set(false);
      }
    });
  }

  private loadAvailableStudents(): void {
    const masterCourse = this.selectedMasterCourse();
    if (!masterCourse) {
      return;
    }

    this.isSearchingStudents.set(true);
    this.courseApiService.searchAvailableStudents(masterCourse.id, '').subscribe({
      next: (students) => {
        this.availableStudents.set(students);
        this.selectedStudents.set([]);
        this.checkedAvailableIds.set([]);
        this.checkedSelectedIds.set([]);
        this.availableStudentFilter.set('');
        this.universeStudentFilter.set('');
        this.universeStudents.set([]);
        this.isSearchingStudents.set(false);
      },
      error: () => {
        this.availableStudents.set([]);
        this.isSearchingStudents.set(false);
      }
    });
  }

  private searchUniverseStudents(search: string): void {
    this.isSearchingUniverseStudents.set(true);
    this.courseApiService.searchAllUnassignedStudents(search).subscribe({
      next: (students) => {
        this.universeStudents.set(students);
        this.isSearchingUniverseStudents.set(false);
      },
      error: () => {
        this.universeStudents.set([]);
        this.isSearchingUniverseStudents.set(false);
      }
    });
  }

  private normalizeMasterCourseCode(code: string): string {
    const normalized = code.trim().toUpperCase();
    return normalized.startsWith('CUR-') ? normalized.slice(4) : normalized;
  }
}
