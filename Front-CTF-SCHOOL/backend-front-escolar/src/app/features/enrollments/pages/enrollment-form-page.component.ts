import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { EnrollmentCourseOption, EnrollmentDetail, EnrollmentPayload } from '../../../core/models/enrollment.models';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

@Component({
  selector: 'app-enrollment-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './enrollment-form-page.component.html',
  styleUrl: './enrollment-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentFormPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly routeEnrollmentId = this.route.snapshot.paramMap.get('id');

  readonly user = this.authStateService.user;
  readonly enrollmentId = this.routeEnrollmentId ? Number(this.routeEnrollmentId) : null;
  readonly isEditMode = this.enrollmentId !== null && Number.isFinite(this.enrollmentId);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly courses = signal<EnrollmentCourseOption[]>([]);
  readonly pageTitle = computed(() => this.isEditMode ? 'Editar Matricula' : 'Nueva Matricula');
  readonly subtitle = computed(() =>
    this.isEditMode
      ? 'Actualizando informacion del estudiante'
      : 'Registrando informacion del estudiante'
  );
  readonly statusBadgeLabel = computed(() => {
    const status = (this.form.controls.status.value || 'ACTIVO').toUpperCase();
    return status === 'PENDIENTE' ? 'Pendiente' : 'Activo';
  });
  readonly statusBadgeClass = computed(() => {
    const status = (this.form.controls.status.value || 'ACTIVO').toUpperCase();
    return status === 'PENDIENTE' ? 'status-badge status-badge--pending' : 'status-badge';
  });
  readonly selectedCourseName = computed(() =>
    this.courses().find((course) => course.id === Number(this.form.controls.courseId.value))?.name ?? 'Curso sin asignar'
  );

  readonly form = this.formBuilder.nonNullable.group({
    studentRun: ['', [Validators.required]],
    studentFirstName: ['', [Validators.required]],
    studentMiddleName: [''],
    studentLastNameFather: ['', [Validators.required]],
    studentLastNameMother: ['', [Validators.required]],
    birthDate: ['', [Validators.required]],
    courseId: [0, [Validators.required, Validators.min(1)]],
    gender: ['Femenino', [Validators.required]],
    address: ['', [Validators.required]],
    specialNeeds: ['Regular'],
    status: ['ACTIVO', [Validators.required]],
    enrollmentDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    guardian: this.formBuilder.nonNullable.group({
      run: ['', [Validators.required]],
      fullName: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      relation: ['Madre', [Validators.required]],
      authorizedPickup: [true]
    }),
    pickupContacts: this.formBuilder.array([this.createPickupContactGroup()])
  });

  constructor() {
    this.loadCoursesAndData();
  }

  get pickupContacts(): FormArray {
    return this.form.controls.pickupContacts;
  }

  get guardianGroup() {
    return this.form.controls.guardian;
  }

  addPickupContact(): void {
    if (this.pickupContacts.length >= 5) {
      this.snackBar.open('Puedes agregar hasta 5 responsables de retiro', 'Cerrar', { duration: 2500 });
      return;
    }
    this.pickupContacts.push(this.createPickupContactGroup());
  }

  removePickupContact(index: number): void {
    if (this.pickupContacts.length === 1) {
      return;
    }
    this.pickupContacts.removeAt(index);
  }

  removeAuthorized(index: number): void {
    this.removePickupContact(index);
  }

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      if (!this.isSaving()) {
        this.snackBar.open('Completa los campos obligatorios para guardar la matricula', 'Cerrar', {
          duration: 2800
        });
      }
      return;
    }

    const payload = this.toPayload();
    this.isSaving.set(true);
    const request$ = this.isEditMode
      ? this.enrollmentApiService.update(this.enrollmentId!, payload)
      : this.enrollmentApiService.create(payload);

    request$.subscribe({
      next: (detail) => {
        this.isSaving.set(false);
        this.snackBar.open(
          this.isEditMode ? 'Matricula actualizada correctamente' : 'Matricula creada correctamente',
          'Cerrar',
          { duration: 2500 }
        );
        void this.router.navigate(['/dashboard/matriculas', detail.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(error, 'No fue posible guardar la matricula');
      }
    });
  }

  anularMatricula(): void {
    if (!this.isEditMode || !this.enrollmentId || this.isSaving()) {
      return;
    }

    const confirmed = window.confirm('Deseas anular esta matricula? Esta accion no se puede deshacer.');
    if (!confirmed) {
      return;
    }

    this.isSaving.set(true);
    this.enrollmentApiService.delete(this.enrollmentId).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.snackBar.open('Matricula anulada correctamente', 'Cerrar', { duration: 2500 });
        void this.router.navigate(['/dashboard/matriculas']);
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(error, 'No fue posible anular la matricula');
      }
    });
  }

  authLabel(index: number): string {
    const group = this.pickupContacts.at(index);
    const name = `${group.get('name')?.value ?? ''} ${group.get('lastName')?.value ?? ''}`.trim();
    const relation = `${group.get('relation')?.value ?? ''}`.trim();

    if (!name && !relation) {
      return 'Nuevo Responsable';
    }
    if (!name) {
      return relation;
    }
    if (!relation) {
      return name;
    }
    return `${name} (${relation})`;
  }

  formatRunValue(path: string): void {
    const control = this.form.get(path);
    if (!control) {
      return;
    }

    control.setValue(this.formatRun(`${control.value ?? ''}`));
  }

  private loadCoursesAndData(): void {
    this.enrollmentApiService.getOverview().subscribe({
      next: (overview) => {
        this.courses.set(overview.courses);
        if (this.isEditMode) {
          this.loadEnrollment();
        } else {
          this.isLoading.set(false);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el catalogo de cursos');
      }
    });
  }

  private loadEnrollment(): void {
    this.enrollmentApiService.getById(this.enrollmentId!).subscribe({
      next: (detail) => {
        this.patchForm(detail);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar la matricula');
      }
    });
  }

  private patchForm(detail: EnrollmentDetail): void {
    const studentNames = this.splitFullName(detail.studentName);
    const studentLastNames = this.splitLastNames(detail.studentLastName);
    const guardianFullName = [detail.guardian.name, detail.guardian.lastName].filter(Boolean).join(' ').trim();

    this.form.patchValue({
      studentRun: detail.studentRun,
      studentFirstName: studentNames.firstName,
      studentMiddleName: studentNames.middleName,
      studentLastNameFather: studentLastNames.fatherLastName,
      studentLastNameMother: studentLastNames.motherLastName,
      birthDate: detail.birthDate,
      courseId: detail.courseId,
      gender: detail.gender,
      address: detail.address,
      specialNeeds: detail.specialNeeds,
      status: detail.status,
      enrollmentDate: detail.enrollmentDate,
      guardian: {
        run: detail.guardian.run,
        fullName: guardianFullName,
        phone: detail.guardian.phone,
        email: detail.guardian.email,
        relation: detail.guardian.relation,
        authorizedPickup: detail.guardian.authorizedPickup
      }
    });

    while (this.pickupContacts.length > 0) {
      this.pickupContacts.removeAt(0);
    }

    const contacts = detail.pickupContacts.length > 0 ? detail.pickupContacts : [this.emptyPickupContact()];
    contacts.forEach((contact) => {
      this.pickupContacts.push(this.formBuilder.nonNullable.group({
        run: [contact.run, [Validators.required]],
        name: [contact.name, [Validators.required]],
        lastName: [contact.lastName, [Validators.required]],
        phone: [contact.phone, [Validators.required]],
        relation: [contact.relation, [Validators.required]],
        authorizedPickup: [contact.authorizedPickup]
      }));
    });
  }

  private createPickupContactGroup() {
    return this.formBuilder.nonNullable.group({
      run: ['', [Validators.required]],
      name: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      relation: ['Familiar', [Validators.required]],
      authorizedPickup: [true]
    });
  }

  private toPayload(): EnrollmentPayload {
    const value = this.form.getRawValue();
    const guardianName = this.splitGuardianName(value.guardian.fullName);

    return {
      studentRun: value.studentRun.trim(),
      studentName: [value.studentFirstName, value.studentMiddleName].filter(Boolean).join(' ').trim(),
      studentLastName: [value.studentLastNameFather, value.studentLastNameMother].filter(Boolean).join(' ').trim(),
      birthDate: value.birthDate,
      gender: value.gender,
      courseId: Number(value.courseId),
      address: value.address.trim(),
      specialNeeds: value.specialNeeds.trim(),
      status: value.status,
      enrollmentDate: value.enrollmentDate,
      guardian: {
        id: null,
        run: value.guardian.run.trim(),
        name: guardianName.name,
        lastName: guardianName.lastName,
        phone: value.guardian.phone.trim(),
        email: value.guardian.email.trim(),
        relation: value.guardian.relation.trim(),
        authorizedPickup: value.guardian.authorizedPickup
      },
      pickupContacts: value.pickupContacts.map((contact) => ({
        id: null,
        run: contact.run.trim(),
        name: contact.name.trim(),
        lastName: contact.lastName.trim(),
        phone: contact.phone.trim(),
        relation: contact.relation.trim(),
        authorizedPickup: contact.authorizedPickup
      }))
    };
  }

  private splitFullName(fullName: string): { firstName: string; middleName: string } {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] ?? '',
      middleName: parts.slice(1).join(' ')
    };
  }

  private splitLastNames(lastNames: string): { fatherLastName: string; motherLastName: string } {
    const parts = (lastNames || '').trim().split(/\s+/).filter(Boolean);
    return {
      fatherLastName: parts[0] ?? '',
      motherLastName: parts.slice(1).join(' ')
    };
  }

  private splitGuardianName(fullName: string): { name: string; lastName: string } {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return { name: parts[0] ?? '', lastName: '' };
    }

    const half = Math.ceil(parts.length / 2);
    return {
      name: parts.slice(0, half).join(' '),
      lastName: parts.slice(half).join(' ')
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

  private emptyPickupContact() {
    return {
      id: null,
      run: '',
      name: '',
      lastName: '',
      phone: '',
      relation: 'Familiar',
      authorizedPickup: true
    };
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
