import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { EnrollmentCourseOption, EnrollmentDetail, EnrollmentPayload } from '../../../core/models/enrollment.models';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';

@Component({
  selector: 'app-enrollment-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatToolbarModule,
    TeacherSideMenuComponent
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
  readonly enrollmentId = this.routeEnrollmentId ? Number(this.routeEnrollmentId) : null;
  readonly isEditMode = this.enrollmentId !== null && Number.isFinite(this.enrollmentId);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly courses = signal<EnrollmentCourseOption[]>([]);
  readonly title = computed(() => this.isEditMode ? 'Editar matricula' : 'Nueva matricula');

  readonly form = this.formBuilder.nonNullable.group({
    studentRun: ['', [Validators.required]],
    studentName: ['', [Validators.required]],
    studentLastName: ['', [Validators.required]],
    birthDate: ['', [Validators.required]],
    gender: ['Femenino', [Validators.required]],
    courseId: [0, [Validators.required, Validators.min(1)]],
    address: ['', [Validators.required]],
    specialNeeds: ['No'],
    status: ['ACTIVO', [Validators.required]],
    enrollmentDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    guardian: this.formBuilder.nonNullable.group({
      run: ['', [Validators.required]],
      name: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
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

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }

  addPickupContact(): void {
    this.pickupContacts.push(this.createPickupContactGroup());
  }

  removePickupContact(index: number): void {
    if (this.pickupContacts.length === 1) {
      return;
    }
    this.pickupContacts.removeAt(index);
  }

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue() as EnrollmentPayload;
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
    this.form.patchValue({
      studentRun: detail.studentRun,
      studentName: detail.studentName,
      studentLastName: detail.studentLastName,
      birthDate: detail.birthDate,
      gender: detail.gender,
      courseId: detail.courseId,
      address: detail.address,
      specialNeeds: detail.specialNeeds,
      status: detail.status,
      enrollmentDate: detail.enrollmentDate,
      guardian: {
        run: detail.guardian.run,
        name: detail.guardian.name,
        lastName: detail.guardian.lastName,
        phone: detail.guardian.phone,
        email: detail.guardian.email,
        relation: detail.guardian.relation,
        authorizedPickup: detail.guardian.authorizedPickup
      }
    });

    while (this.pickupContacts.length > 0) {
      this.pickupContacts.removeAt(0);
    }
    detail.pickupContacts.forEach((contact) => {
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

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
