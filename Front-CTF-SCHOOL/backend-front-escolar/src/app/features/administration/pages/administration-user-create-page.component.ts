import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  AdministrationRoleCode,
  AdministrationRoleOption,
  AdministrationUserDetail,
  AdministrationUserFormValue,
  AdministrationUserStatus
} from '../../../core/models/administration.models';
import { AdministrationApiService } from '../../../core/services/administration-api.service';
import { AdministrationShellComponent } from '../components/administration-shell.component';

@Component({
  selector: 'app-administration-user-create-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSnackBarModule,
    AdministrationShellComponent
  ],
  templateUrl: './administration-user-create-page.component.html',
  styleUrl: './administration-user-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationUserCreatePageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly administrationApi = inject(AdministrationApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  readonly roleOptions = signal<AdministrationRoleOption[]>([]);
  readonly editingUserId = signal<number | null>(null);
  readonly isSaving = signal(false);
  readonly selectedRoleDescription = computed(() => {
    const roleCode = this.form.controls.roleCode.value as AdministrationRoleCode;
    return this.roleOptions().find((role) => role.code === roleCode)?.description ?? '';
  });
  readonly title = computed(() => this.editingUserId() ? 'Editar usuario' : 'Nuevo usuario');

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    paternalLastName: ['', [Validators.required]],
    maternalLastName: [''],
    email: ['', [Validators.required, Validators.email]],
    run: ['', [Validators.required, Validators.pattern(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+56\s9\s\d{4}\s\d{4}$/)]],
    initialStatus: ['Activo' as AdministrationUserStatus, [Validators.required]],
    roleCode: ['PROFESOR' as AdministrationRoleCode, [Validators.required]],
    temporaryPassword: [''],
    forcePasswordChange: [true],
    twoFactorRequired: [false],
    accountExpiresAt: ['']
  });

  constructor() {
    this.administrationApi.getRoleOptions().subscribe((roles) => this.roleOptions.set(roles));
    this.route.queryParamMap.subscribe((params) => {
      const editId = Number(params.get('edit'));
      if (Number.isFinite(editId) && editId > 0) {
        this.editingUserId.set(editId);
        this.loadUser(editId);
      } else {
        this.editingUserId.set(null);
      }
    });
  }

  roleButtonClass(code: AdministrationRoleCode): string {
    return this.form.controls.roleCode.value === code ? 'is-selected' : '';
  }

  selectRole(code: AdministrationRoleCode): void {
    this.form.controls.roleCode.setValue(code);
  }

  cancel(): void {
    void this.router.navigate(['/dashboard/administracion/usuarios']);
  }

  submit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const payload = this.toPayload();
    const request = this.editingUserId()
      ? this.administrationApi.updateUser(this.editingUserId()!, payload)
      : this.administrationApi.createUser(payload);

    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.snackBar.open(this.editingUserId() ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente', 'Cerrar', {
          duration: 2800
        });
        void this.router.navigate(['/dashboard/administracion/usuarios']);
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : 'No fue posible guardar el usuario', 'Cerrar', {
          duration: 3200
        });
      }
    });
  }

  private loadUser(userId: number): void {
    this.administrationApi.getUserById(userId).subscribe((user) => {
      if (!user) {
        return;
      }

      this.patchUser(user);
    });
  }

  private patchUser(user: AdministrationUserDetail): void {
    this.form.patchValue({
      firstName: user.firstName,
      paternalLastName: user.paternalLastName,
      maternalLastName: user.maternalLastName,
      email: user.email,
      run: user.run,
      phone: user.phone,
      initialStatus: user.status as AdministrationUserStatus,
      roleCode: user.roleCode,
      temporaryPassword: '',
      forcePasswordChange: user.forcePasswordChange,
      twoFactorRequired: user.twoFactorRequired,
      accountExpiresAt: user.accountExpiresAt ?? ''
    });
  }

  private toPayload(): AdministrationUserFormValue {
    return {
      ...this.form.getRawValue(),
      accountExpiresAt: this.normalizeDateControl(this.form.controls.accountExpiresAt.value)
    };
  }

  private normalizeDateControl(value: string | Date | null): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      const month = `${value.getMonth() + 1}`.padStart(2, '0');
      const day = `${value.getDate()}`.padStart(2, '0');
      return `${value.getFullYear()}-${month}-${day}`;
    }

    return value;
  }
}
