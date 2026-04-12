import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DateAdapter, MAT_DATE_LOCALE, MatNativeDateModule, NativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherApiService } from '../../../core/services/teacher-api.service';
import { Subject } from '../../../core/models/subject.models';
import { TeacherAssignedCourse, TeacherDetail, TeacherPayload } from '../../../core/models/teacher.models';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';

class ChileDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 1;
  }
}

@Component({
  selector: 'app-teacher-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatToolbarModule,
    TeacherSideMenuComponent
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-CL' },
    { provide: DateAdapter, useClass: ChileDateAdapter }
  ],
  templateUrl: './teacher-form-page.component.html',
  styleUrl: './teacher-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherFormPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly teacherApiService = inject(TeacherApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly teacherId = Number(this.route.snapshot.paramMap.get('id'));
  readonly isEditMode = Number.isFinite(this.teacherId) && this.teacherId > 0;
  readonly isLoading = signal(false);
  readonly subjectOptions = signal<Subject[]>([]);
  readonly assignedCourses = signal<TeacherAssignedCourse[]>([]);

  readonly form = this.formBuilder.nonNullable.group({
    firstNames: ['', [Validators.required, Validators.maxLength(120)]],
    paternalLastName: ['', [Validators.required, Validators.maxLength(80)]],
    maternalLastName: ['', [Validators.maxLength(80)]],
    run: ['', [Validators.required, Validators.maxLength(20)]],
    birthDate: [null as Date | null, Validators.required],
    gender: ['', Validators.required],
    phone: ['', [Validators.required, Validators.maxLength(30)]],
    institutionalEmail: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    address: ['', [Validators.required, Validators.maxLength(255)]],
    professionalTitle: ['', [Validators.required, Validators.maxLength(180)]],
    contractType: ['', Validators.required],
    weeklyHours: [38, [Validators.required, Validators.min(1), Validators.max(60)]],
    startDate: [null as Date | null, Validators.required],
    employmentStatus: ['Activo', Validators.required],
    subjectIds: [[] as number[], Validators.required],
    emergencyContactName: ['', [Validators.required, Validators.maxLength(160)]],
    emergencyContactRelation: ['', [Validators.required, Validators.maxLength(80)]],
    emergencyContactPhone: ['', [Validators.required, Validators.maxLength(30)]]
  });

  constructor() {
    this.loadCatalog();
    if (this.isEditMode) {
      this.loadTeacher();
    }
  }

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
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

  private loadCatalog(): void {
    this.teacherApiService.getOverview().subscribe({
      next: (overview) => this.subjectOptions.set(overview.subjects),
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar las asignaturas')
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
      birthDate: teacher.birthDate ? new Date(`${teacher.birthDate}T00:00:00`) : null,
      gender: teacher.gender,
      phone: teacher.phone,
      institutionalEmail: teacher.institutionalEmail,
      address: teacher.address,
      professionalTitle: teacher.professionalTitle,
      contractType: teacher.contractType,
      weeklyHours: teacher.weeklyHours,
      startDate: teacher.startDate ? new Date(`${teacher.startDate}T00:00:00`) : null,
      employmentStatus: teacher.employmentStatus,
      subjectIds: teacher.subjects.map((subject) => subject.id),
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
      birthDate: this.toDateString(rawValue.birthDate),
      gender: rawValue.gender,
      phone: rawValue.phone.trim(),
      institutionalEmail: rawValue.institutionalEmail.trim(),
      address: rawValue.address.trim(),
      professionalTitle: rawValue.professionalTitle.trim(),
      contractType: rawValue.contractType,
      weeklyHours: Number(rawValue.weeklyHours),
      startDate: this.toDateString(rawValue.startDate),
      employmentStatus: rawValue.employmentStatus,
      subjectIds: rawValue.subjectIds.map(Number),
      emergencyContactName: rawValue.emergencyContactName.trim(),
      emergencyContactRelation: rawValue.emergencyContactRelation.trim(),
      emergencyContactPhone: rawValue.emergencyContactPhone.trim()
    };
  }

  private toDateString(value: Date | null): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
