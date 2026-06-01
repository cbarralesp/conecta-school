import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, debounceTime, merge, of, startWith, switchMap } from 'rxjs';
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
  readonly requestedStaffType = (this.route.snapshot.data['staffType'] as string | undefined)?.toUpperCase() === 'ASISTENTE'
    ? 'ASISTENTE'
    : 'DOCENTE';
  readonly user = this.authStateService.user;
  readonly isEditMode = Number.isFinite(this.teacherId) && this.teacherId > 0;
  readonly isLoading = signal(false);
  readonly subjectOptions = signal<Subject[]>([]);
  readonly courseOptions = signal<Course[]>([]);
  readonly chileRegions = signal<ChileRegion[]>([]);
  readonly assignedCourses = signal<TeacherAssignedCourse[]>([]);
  readonly staffType = signal<'DOCENTE' | 'ASISTENTE'>(this.requestedStaffType);
  readonly generatedUsernamePreview = signal('');
  readonly staffTypeLabel = computed(() => this.staffType() === 'ASISTENTE' ? 'Asistente' : 'Docente');
  readonly pageTitle = computed(() => this.isEditMode ? `Editar ${this.staffTypeLabel()}` : `Nuevo ${this.staffTypeLabel()}`);
  readonly pageSubtitle = computed(() =>
    this.isEditMode
      ? `Actualizando informacion del ${this.staffTypeLabel().toLowerCase()}`
      : `Registrando informacion del ${this.staffTypeLabel().toLowerCase()}`
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
    emergencyContactPhone: ['', [Validators.required, Validators.maxLength(30)]],
    systemAccess: this.formBuilder.nonNullable.group({
      configureAccess: [false],
      createAccount: [false],
      username: [''],
      temporaryPassword: [''],
      notifyByEmail: [true],
      contactEmail: [''],
      status: ['Sin cuenta']
    })
  });

  constructor() {
    this.loadCatalog();
    this.observeLocationSelection();
    this.observeAccessPreview();
    if (this.isEditMode) {
      this.loadTeacher();
    }
  }

  teacherCommunes(): ChileCommune[] {
    return this.findCommunesByRegionId(this.form.controls.regionId.value);
  }

  get systemAccessGroup() {
    return this.form.controls.systemAccess;
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
          this.isEditMode
            ? `${this.staffTypeLabel()} actualizado correctamente`
            : `${this.staffTypeLabel()} creado correctamente`,
          'Cerrar',
          { duration: 2800 }
        );
        void this.router.navigate(['/dashboard/profesores', teacher.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible guardar el docente');
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

  shouldShowSystemAccessConfig(): boolean {
    return this.systemAccessGroup.controls.configureAccess.value;
  }

  shouldShowStaffAccountBlock(): boolean {
    return this.shouldShowSystemAccessConfig() && this.systemAccessGroup.controls.createAccount.value;
  }

  accessUsernamePreview(): string {
    const existingUsername = this.systemAccessGroup.controls.username.value.trim();
    if (existingUsername) {
      return existingUsername;
    }
    return this.generatedUsernamePreview() || this.buildBaseAccessUsernamePreview();
  }

  accessPasswordPreview(): string {
    const existingPassword = this.systemAccessGroup.controls.temporaryPassword.value.trim();
    if (existingPassword) {
      return existingPassword;
    }
    return this.buildDefaultAccessPassword();
  }

  copyAccessValue(value: string, label: string): void {
    if (!value.trim()) {
      this.snackBar.open(`No hay ${label.toLowerCase()} para copiar`, 'Cerrar', { duration: 2200 });
      return;
    }

    if (!navigator?.clipboard?.writeText) {
      this.snackBar.open('No fue posible copiar al portapapeles en este navegador', 'Cerrar', { duration: 2200 });
      return;
    }

    navigator.clipboard.writeText(value).then(() => {
      this.snackBar.open(`${label} copiado`, 'Cerrar', { duration: 1800 });
    }).catch(() => {
      this.snackBar.open(`No fue posible copiar ${label.toLowerCase()}`, 'Cerrar', { duration: 2200 });
    });
  }

  formatRunValue(): void {
    const control = this.form.controls.run;
    control.setValue(this.formatRun(`${control.value ?? ''}`));
  }

  formatPhoneValue(controlName: 'phone' | 'emergencyContactPhone'): void {
    const control = this.form.controls[controlName];
    control.setValue(this.formatPhone(`${control.value ?? ''}`), { emitEvent: false });
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
        this.staffType.set(teacher.staffType === 'ASISTENTE' ? 'ASISTENTE' : 'DOCENTE');
        this.assignedCourses.set(teacher.assignedCourses);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el docente');
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
      emergencyContactPhone: teacher.emergencyContact.phone,
      systemAccess: {
        configureAccess: teacher.systemAccess.configureAccess,
        createAccount: teacher.systemAccess.createAccount,
        username: teacher.systemAccess.username,
        temporaryPassword: '',
        notifyByEmail: teacher.systemAccess.notifyByEmail,
        contactEmail: teacher.systemAccess.contactEmail,
        status: teacher.systemAccess.status || 'Sin cuenta'
      }
    });
  }

  private toPayload(): TeacherPayload {
    const rawValue = this.form.getRawValue();
    return {
      staffType: this.staffType(),
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
      emergencyContactPhone: rawValue.emergencyContactPhone.trim(),
      systemAccess: this.toSystemAccessPayload()
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

  private formatPhone(value: string): string {
    const clean = `${value ?? ''}`.replace(/[^\d+]/g, '');
    if (!clean) {
      return '';
    }

    const normalized = clean.startsWith('+') ? `+${clean.slice(1).replace(/\+/g, '')}` : clean.replace(/\+/g, '');
    const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized;

    if (digits.startsWith('569')) {
      const local = digits.slice(2, 11);
      const blocks = [local.slice(0, 1), local.slice(1, 5), local.slice(5, 9)].filter(Boolean);
      return `+56 ${blocks.join(' ')}`.trim();
    }

    if (digits.startsWith('56')) {
      const local = digits.slice(2, 11);
      const blocks = [local.slice(0, 1), local.slice(1, 5), local.slice(5, 9)].filter(Boolean);
      return `+56 ${blocks.join(' ')}`.trim();
    }

    if (normalized.startsWith('+')) {
      return normalized;
    }

    return digits;
  }

  private toSystemAccessPayload() {
    const value = this.systemAccessGroup.getRawValue();
    const configureAccess = value.configureAccess;
    const createAccount = configureAccess && value.createAccount;
    const username = createAccount ? this.accessUsernamePreview() : '';
    const temporaryPassword = createAccount ? this.accessPasswordPreview() : '';
    const contactEmail = createAccount
      ? (this.form.controls.institutionalEmail.value || '').trim().toLowerCase()
      : '';

    return {
      configureAccess,
      createAccount,
      username,
      temporaryPassword,
      notifyByEmail: createAccount ? value.notifyByEmail : false,
      contactEmail,
      status: createAccount ? 'Pendiente' : 'Sin cuenta'
    };
  }

  private buildDefaultAccessPassword(): string {
    const normalizedRun = `${this.form.controls.run.value ?? ''}`.replace(/[^0-9kK]/g, '').toUpperCase();
    const suffix = normalizedRun.slice(-4) || '2024';
    const firstName = this.normalizeAccessPart(this.form.controls.firstNames.value).split(/\s+/).filter(Boolean)[0] ?? '';
    const initial = firstName.charAt(0).toUpperCase() || (this.staffType() === 'ASISTENTE' ? 'A' : 'D');
    return `Tfs${initial}${suffix}!`;
  }

  private buildBaseAccessUsernamePreview(): string {
    const firstName = this.normalizeAccessPart(this.form.controls.firstNames.value).split(/\s+/).filter(Boolean)[0] ?? '';
    const paternalLastName = this.normalizeAccessPart(this.form.controls.paternalLastName.value);

    let candidate = `${firstName.charAt(0)}${paternalLastName}`.toLowerCase();
    if (!candidate) {
      candidate = this.staffType() === 'ASISTENTE' ? 'asistente' : 'docente';
    }
    if (candidate.length < 4 && paternalLastName) {
      candidate = `${candidate}${paternalLastName}`.slice(0, 12);
    }
    return candidate.slice(0, 16);
  }

  private normalizeAccessPart(value: string): string {
    return `${value ?? ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .toLowerCase();
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

  private observeAccessPreview(): void {
    merge(
      this.form.controls.run.valueChanges,
      this.form.controls.firstNames.valueChanges,
      this.form.controls.paternalLastName.valueChanges,
      this.form.controls.maternalLastName.valueChanges,
      this.systemAccessGroup.controls.configureAccess.valueChanges,
      this.systemAccessGroup.controls.createAccount.valueChanges,
      this.systemAccessGroup.controls.username.valueChanges
    ).pipe(
      startWith(null),
      debounceTime(120),
      switchMap(() => {
        if (!this.shouldShowStaffAccountBlock()) {
          return of('');
        }

        const firstNames = this.form.controls.firstNames.value.trim();
        const paternalLastName = this.form.controls.paternalLastName.value.trim();
        if (!firstNames && !paternalLastName) {
          return of('');
        }

        return this.teacherApiService.previewSystemAccessUsername({
          run: this.form.controls.run.value.trim(),
          firstNames,
          paternalLastName,
          maternalLastName: this.form.controls.maternalLastName.value.trim(),
          staffType: this.staffType()
        }).pipe(
          switchMap((preview) => of(preview.username ?? '')),
          catchError(() => of(this.buildBaseAccessUsernamePreview()))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((preview) => {
      this.generatedUsernamePreview.set(preview ?? '');
    });
  }

  private findCommunesByRegionId(regionId: number): ChileCommune[] {
    if (!regionId || regionId <= 0) {
      return [];
    }
    return this.chileRegions().find((region) => region.id === Number(regionId))?.communes ?? [];
  }
}
