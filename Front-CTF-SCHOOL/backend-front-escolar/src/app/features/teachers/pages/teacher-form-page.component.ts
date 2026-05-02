import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { Course } from '../../../core/models/course.models';
import { CourseApiService } from '../../../core/services/course-api.service';
import { TeacherApiService } from '../../../core/services/teacher-api.service';
import { Subject } from '../../../core/models/subject.models';
import { TeacherAssignedCourse, TeacherDetail, TeacherPayload } from '../../../core/models/teacher.models';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';
import { LocationApiService } from '../../../core/services/location-api.service';
import { ChileCommune, ChileRegion } from '../../../core/models/location.models';

@Component({
  selector: 'app-teacher-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './teacher-form-page.component.html',
  styleUrl: './teacher-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherFormPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly teacherApiService = inject(TeacherApiService);
  private readonly courseApiService = inject(CourseApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly locationApiService = inject(LocationApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly teacherId = Number(this.route.snapshot.paramMap.get('id'));
  readonly user = this.authStateService.user;
  readonly isEditMode = Number.isFinite(this.teacherId) && this.teacherId > 0;
  readonly isLoading = signal(false);
  readonly subjectOptions = signal<Subject[]>([]);
  readonly courseOptions = signal<Course[]>([]);
  readonly chileRegions = signal<ChileRegion[]>([]);
  readonly assignedCourses = signal<TeacherAssignedCourse[]>([]);
  readonly pageTitle = computed(() => this.isEditMode ? 'Editar Profesor' : 'Nuevo Profesor');
  readonly pageSubtitle = computed(() =>
    this.isEditMode ? 'Actualizando informacion del docente' : 'Registrando informacion del docente'
  );
  readonly statusBadgeLabel = computed(() => this.form.controls.employmentStatus.value || 'Activo');

  readonly form = this.formBuilder.nonNullable.group({
    firstNames: ['', [Validators.required, Validators.maxLength(120)]],
    paternalLastName: ['', [Validators.required, Validators.maxLength(80)]],
    maternalLastName: ['', [Validators.maxLength(80)]],
    run: ['', [Validators.required, Validators.maxLength(20)]],
    birthDate: ['', Validators.required],
    gender: ['Masculino', Validators.required],
    phone: ['', [Validators.required, Validators.maxLength(30)]],
    institutionalEmail: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    regionId: [0],
    communeId: [0],
    address: ['', [Validators.required, Validators.maxLength(255)]],
    professionalTitle: ['', [Validators.required, Validators.maxLength(180)]],
    contractType: ['Part-time', Validators.required],
    weeklyHours: [38, [Validators.required, Validators.min(1), Validators.max(60)]],
    startDate: ['', Validators.required],
    employmentStatus: ['Activo', Validators.required],
    subjectIds: [[] as number[], Validators.required],
    courseIds: [[] as number[]],
    emergencyContactName: ['', [Validators.required, Validators.maxLength(160)]],
    emergencyContactRelation: ['', [Validators.required, Validators.maxLength(80)]],
    emergencyContactPhone: ['', [Validators.required, Validators.maxLength(30)]]
  });

  constructor() {
    this.loadCatalog();
    this.observeLocationSelection();
    if (this.isEditMode) {
      this.loadTeacher();
    }
  }

  teacherCommunes(): ChileCommune[] {
    return this.findCommunesByRegionId(this.form.controls.regionId.value);
  }

  isControlInvalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getControlError(path: string): string {
    const control = this.form.get(path);
    if (!control || !control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('email')) {
      return 'Ingresa un correo valido.';
    }
    if (control.hasError('min')) {
      return 'Ingresa un valor valido.';
    }
    if (control.hasError('max')) {
      return 'Ingresa un valor dentro del rango permitido.';
    }
    return 'Revisa este campo.';
  }

  hasInvalidSubjects(): boolean {
    const control = this.form.controls.subjectIds;
    return control.invalid && (control.touched || control.dirty);
  }

  saveTeacher(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Completa los campos obligatorios del formulario', 'Cerrar', { duration: 2800 });
      return;
    }

    const payload = this.toPayload();
    this.isLoading.set(true);
    const request$ = this.isEditMode
      ? this.teacherApiService.update(this.teacherId, payload)
      : this.teacherApiService.create(payload);

    request$.subscribe({
      next: (teacher) => {
        this.isLoading.set(false);
        this.snackBar.open(
          this.isEditMode ? 'Profesor actualizado correctamente' : 'Profesor creado correctamente',
          'Cerrar',
          { duration: 2800 }
        );
        void this.router.navigate(['/dashboard/profesores', teacher.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible guardar el profesor');
      }
    });
  }

  deactivateTeacher(): void {
    this.form.controls.employmentStatus.setValue('Inactivo');
    this.snackBar.open('Estado cambiado a Inactivo. Guarda los cambios para aplicar.', 'Cerrar', {
      duration: 2500
    });
  }

  toggleSubject(subjectId: number, checked: boolean): void {
    const current = this.form.controls.subjectIds.value;
    const next = checked
      ? Array.from(new Set([...current, subjectId]))
      : current.filter((id) => id !== subjectId);
    this.form.controls.subjectIds.setValue(next);
    this.form.controls.subjectIds.markAsDirty();
    this.form.controls.subjectIds.markAsTouched();
    this.form.controls.subjectIds.updateValueAndValidity();
  }

  toggleCourse(courseId: number, checked: boolean): void {
    const current = this.form.controls.courseIds.value;
    const next = checked
      ? Array.from(new Set([...current, courseId]))
      : current.filter((id) => id !== courseId);
    this.form.controls.courseIds.setValue(next);
    this.form.controls.courseIds.markAsDirty();
    this.form.controls.courseIds.markAsTouched();
    this.form.controls.courseIds.updateValueAndValidity();
  }

  isSubjectSelected(subjectId: number): boolean {
    return this.form.controls.subjectIds.value.includes(subjectId);
  }

  isCourseSelected(courseId: number): boolean {
    return this.form.controls.courseIds.value.includes(courseId);
  }

  selectedSubjectNames(): string[] {
    return this.subjectOptions()
      .filter((subject) => this.form.controls.subjectIds.value.includes(subject.id))
      .map((subject) => subject.name);
  }

  selectedCourseNames(): string[] {
    return this.courseOptions()
      .filter((course) => this.form.controls.courseIds.value.includes(course.id))
      .map((course) => course.name);
  }

  formatRunValue(): void {
    const control = this.form.controls.run;
    control.setValue(this.formatRun(`${control.value ?? ''}`));
  }

  private loadCatalog(): void {
    this.teacherApiService.getOverview().subscribe({
      next: (overview) => this.subjectOptions.set(overview.subjects),
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar las asignaturas')
    });

    this.courseApiService.findAll().subscribe({
      next: (courses) => this.courseOptions.set(courses),
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar los cursos')
    });

    this.locationApiService.getChileRegions().subscribe({
      next: (regions) => this.chileRegions.set(regions),
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar regiones y comunas')
    });
  }

  private loadTeacher(): void {
    this.isLoading.set(true);
    this.teacherApiService.getById(this.teacherId).subscribe({
      next: (teacher) => {
        this.patchTeacher(teacher);
        this.assignedCourses.set(teacher.assignedCourses);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el profesor');
      }
    });
  }

  private patchTeacher(teacher: TeacherDetail): void {
    this.form.patchValue({
      firstNames: teacher.firstNames,
      paternalLastName: teacher.paternalLastName,
      maternalLastName: teacher.maternalLastName,
      run: teacher.run,
      birthDate: teacher.birthDate,
      gender: this.normalizeBinaryGender(teacher.gender, 'Masculino'),
      phone: teacher.phone,
      institutionalEmail: teacher.institutionalEmail,
      regionId: teacher.regionId ?? 0,
      communeId: teacher.communeId ?? 0,
      address: teacher.address,
      professionalTitle: teacher.professionalTitle,
      contractType: teacher.contractType,
      weeklyHours: teacher.weeklyHours,
      startDate: teacher.startDate,
      employmentStatus: teacher.employmentStatus,
      subjectIds: teacher.subjects.map((subject) => subject.id),
      courseIds: Array.from(new Set(teacher.assignedCourses.map((course) => course.id))),
      emergencyContactName: teacher.emergencyContact.fullName,
      emergencyContactRelation: teacher.emergencyContact.relation,
      emergencyContactPhone: teacher.emergencyContact.phone
    });
  }

  private toPayload(): TeacherPayload {
    const rawValue = this.form.getRawValue();
    return {
      firstNames: rawValue.firstNames.trim(),
      paternalLastName: rawValue.paternalLastName.trim(),
      maternalLastName: rawValue.maternalLastName.trim(),
      run: rawValue.run.trim(),
      birthDate: rawValue.birthDate,
      gender: this.normalizeBinaryGender(rawValue.gender, 'Masculino'),
      phone: rawValue.phone.trim(),
      institutionalEmail: rawValue.institutionalEmail.trim(),
      regionId: rawValue.regionId > 0 ? Number(rawValue.regionId) : null,
      communeId: rawValue.communeId > 0 ? Number(rawValue.communeId) : null,
      address: rawValue.address.trim(),
      professionalTitle: rawValue.professionalTitle.trim(),
      contractType: rawValue.contractType,
      weeklyHours: Number(rawValue.weeklyHours),
      startDate: rawValue.startDate,
      employmentStatus: rawValue.employmentStatus,
      subjectIds: rawValue.subjectIds.map(Number),
      courseIds: rawValue.courseIds.map(Number),
      emergencyContactName: rawValue.emergencyContactName.trim(),
      emergencyContactRelation: rawValue.emergencyContactRelation.trim(),
      emergencyContactPhone: rawValue.emergencyContactPhone.trim()
    };
  }

  private formatRun(value: string): string {
    const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
    if (!clean) {
      return '';
    }

    const body = clean.slice(0, -1);
    const verifier = clean.slice(-1);
    const reversed = body.split('').reverse();
    const parts: string[] = [];

    for (let index = 0; index < reversed.length; index += 1) {
      if (index > 0 && index % 3 === 0) {
        parts.push('.');
      }
      parts.push(reversed[index]!);
    }

    return `${parts.reverse().join('')}-${verifier}`;
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }

  private normalizeBinaryGender(value: string, fallback: 'Femenino' | 'Masculino'): 'Femenino' | 'Masculino' {
    return value === 'Femenino' ? 'Femenino' : value === 'Masculino' ? 'Masculino' : fallback;
  }

  private observeLocationSelection(): void {
    this.form.controls.regionId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((regionId) => {
        const normalizedRegionId = Number(regionId ?? 0);
        const communes = this.findCommunesByRegionId(normalizedRegionId);
        const currentCommuneId = Number(this.form.controls.communeId.value ?? 0);
        if (!communes.some((commune) => commune.id === currentCommuneId)) {
          this.form.controls.communeId.setValue(0);
        }
      });
  }

  private findCommunesByRegionId(regionId: number): ChileCommune[] {
    if (!regionId || regionId <= 0) {
      return [];
    }
    return this.chileRegions().find((region) => region.id === Number(regionId))?.communes ?? [];
  }
}
