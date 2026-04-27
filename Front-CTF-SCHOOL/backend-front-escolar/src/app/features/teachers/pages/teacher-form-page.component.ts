import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherApiService } from '../../../core/services/teacher-api.service';
import { Subject } from '../../../core/models/subject.models';
import { TeacherAssignedCourse, TeacherDetail, TeacherPayload } from '../../../core/models/teacher.models';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

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
  private readonly authStateService = inject(AuthStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly teacherId = Number(this.route.snapshot.paramMap.get('id'));
  readonly user = this.authStateService.user;
  readonly isEditMode = Number.isFinite(this.teacherId) && this.teacherId > 0;
  readonly isLoading = signal(false);
  readonly subjectOptions = signal<Subject[]>([]);
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
    address: ['', [Validators.required, Validators.maxLength(255)]],
    professionalTitle: ['', [Validators.required, Validators.maxLength(180)]],
    contractType: ['Part-time', Validators.required],
    weeklyHours: [38, [Validators.required, Validators.min(1), Validators.max(60)]],
    startDate: ['', Validators.required],
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
  }

  isSubjectSelected(subjectId: number): boolean {
    return this.form.controls.subjectIds.value.includes(subjectId);
  }

  selectedSubjectNames(): string[] {
    return this.subjectOptions()
      .filter((subject) => this.form.controls.subjectIds.value.includes(subject.id))
      .map((subject) => subject.name);
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
      gender: teacher.gender,
      phone: teacher.phone,
      institutionalEmail: teacher.institutionalEmail,
      address: teacher.address,
      professionalTitle: teacher.professionalTitle,
      contractType: teacher.contractType,
      weeklyHours: teacher.weeklyHours,
      startDate: teacher.startDate,
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
      birthDate: rawValue.birthDate,
      gender: rawValue.gender,
      phone: rawValue.phone.trim(),
      institutionalEmail: rawValue.institutionalEmail.trim(),
      address: rawValue.address.trim(),
      professionalTitle: rawValue.professionalTitle.trim(),
      contractType: rawValue.contractType,
      weeklyHours: Number(rawValue.weeklyHours),
      startDate: rawValue.startDate,
      employmentStatus: rawValue.employmentStatus,
      subjectIds: rawValue.subjectIds.map(Number),
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
}
