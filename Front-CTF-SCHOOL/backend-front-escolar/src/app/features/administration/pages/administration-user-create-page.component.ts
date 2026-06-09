import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { merge } from 'rxjs';
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
    MatIconModule,
    MatSnackBarModule,
    AdministrationShellComponent
  ],
  templateUrl: './administration-user-create-page.component.html',
  styleUrl: './administration-user-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationUserCreatePageComponent {
  private static readonly EXPIRY_MODES = {
    NONE: 'none',
    MONTH_1: 'month_1',
    MONTH_6: 'month_6',
    YEAR_END: 'year_end',
    CUSTOM: 'custom'
  } as const;

  private static readonly TWO_FACTOR_MODES = {
    OPTIONAL: 'OPTIONAL',
    REQUIRED: 'REQUIRED',
    DISABLED: 'DISABLED'
  } as const;

  private readonly fb = inject(FormBuilder);
  private readonly administrationApi = inject(AdministrationApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private usernameWasEditedManually = false;
  private lastSuggestedUsername = '';

  readonly roleOptions = signal<AdministrationRoleOption[]>([]);
  readonly editingUserId = signal<number | null>(null);
  readonly isSaving = signal(false);
  readonly expiryModes = AdministrationUserCreatePageComponent.EXPIRY_MODES;
  readonly twoFactorModes = AdministrationUserCreatePageComponent.TWO_FACTOR_MODES;
  readonly accountExpiryModeOptions = Object.values(AdministrationUserCreatePageComponent.EXPIRY_MODES);
  readonly selectedRole = computed(() => {
    const roleCode = this.form.controls.roleCode.value as AdministrationRoleCode;
    return this.roleOptions().find((role) => role.code === roleCode) ?? null;
  });
  readonly selectedRoleDescription = computed(() => {
    const roleCode = this.form.controls.roleCode.value as AdministrationRoleCode;
    return this.roleOptions().find((role) => role.code === roleCode)?.description ?? '';
  });
  readonly title = computed(() => this.editingUserId() ? 'Editar usuario' : 'Nuevo usuario');
  readonly subtitle = computed(() =>
    this.editingUserId() ? 'Actualiza los datos y permisos de acceso del usuario.' : 'Registra un nuevo usuario en el sistema.'
  );
  readonly currentStatusTone = computed(() => this.resolveStatusTone(this.form.controls.initialStatus.value));
  readonly statusSwitchChecked = computed(() => this.form.controls.initialStatus.value === 'Activo');

  readonly form = this.fb.nonNullable.group({
    username: [''],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    secondName: [''],
    paternalLastName: ['', [Validators.required]],
    maternalLastName: [''],
    email: ['', [Validators.required, Validators.email]],
    run: ['', [Validators.required, Validators.pattern(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+56\s9\s\d{4}\s\d{4}$/)]],
    initialStatus: ['Activo' as AdministrationUserStatus, [Validators.required]],
    roleCode: ['PROFESOR' as AdministrationRoleCode, [Validators.required]],
    temporaryPassword: [''],
    accountExpiryMode: [this.expiryModes.NONE as AccountExpiryMode],
    customAccountExpiresAt: [''],
    forcePasswordChange: [true],
    twoFactorMode: [this.twoFactorModes.OPTIONAL as TwoFactorMode]
  });

  constructor() {
    this.administrationApi.getRoleOptions().subscribe((roles) => this.roleOptions.set(roles));
    this.bindUsernameAutofill();
    this.route.queryParamMap.subscribe((params) => {
      const editId = Number(params.get('edit'));
      if (Number.isFinite(editId) && editId > 0) {
        this.editingUserId.set(editId);
        this.loadUser(editId);
      } else {
        this.editingUserId.set(null);
        this.resetForm();
      }
    });
  }

  roleButtonClass(code: AdministrationRoleCode): boolean {
    return this.form.controls.roleCode.value === code;
  }

  selectRole(code: AdministrationRoleCode): void {
    this.form.controls.roleCode.setValue(code);
    this.form.controls.roleCode.markAsTouched();
  }

  cancel(): void {
    void this.router.navigate(['/dashboard/administracion/usuarios']);
  }

  toggleActiveStatus(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.form.controls.initialStatus.setValue(checked ? 'Activo' : 'Inactivo');
  }

  formatPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatChileanMobile(input.value);
    this.form.controls.phone.setValue(formatted, { emitEvent: false });
    input.value = formatted;
  }

  submit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      if (this.form.invalid) {
        this.snackBar.open('Completa los campos obligatorios para guardar el usuario', 'Cerrar', {
          duration: 3000
        });
      }
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
    const { primaryName, secondaryName } = this.splitGivenNames(user.firstName);
    const expiryMode = this.detectExpiryMode(user.accountExpiresAt);
    this.usernameWasEditedManually = true;
    this.lastSuggestedUsername = user.username ?? '';
    this.form.patchValue({
      firstName: primaryName,
      secondName: secondaryName,
      username: user.username,
      paternalLastName: user.paternalLastName,
      maternalLastName: user.maternalLastName,
      email: user.email,
      run: user.run,
      phone: this.formatChileanMobile(user.phone),
      initialStatus: user.status as AdministrationUserStatus,
      roleCode: user.roleCode,
      temporaryPassword: '',
      accountExpiryMode: expiryMode,
      customAccountExpiresAt: user.accountExpiresAt ?? '',
      forcePasswordChange: user.forcePasswordChange,
      twoFactorMode: user.twoFactorRequired ? this.twoFactorModes.REQUIRED : this.twoFactorModes.OPTIONAL
    });
  }

  private resetForm(): void {
    this.usernameWasEditedManually = false;
    this.lastSuggestedUsername = '';
    this.form.reset({
      firstName: '',
      secondName: '',
      username: '',
      paternalLastName: '',
      maternalLastName: '',
      email: '',
      run: '',
      phone: '',
      initialStatus: 'Activo',
      roleCode: 'PROFESOR',
      temporaryPassword: '',
      accountExpiryMode: this.expiryModes.NONE,
      customAccountExpiresAt: '',
      forcePasswordChange: true,
      twoFactorMode: this.twoFactorModes.OPTIONAL
    });
  }

  private bindUsernameAutofill(): void {
    merge(
      this.form.controls.firstName.valueChanges,
      this.form.controls.secondName.valueChanges,
      this.form.controls.paternalLastName.valueChanges,
      this.form.controls.maternalLastName.valueChanges
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncUsernameSuggestion());

    this.form.controls.username.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (this.editingUserId()) {
          return;
        }

        const current = value.trim();
        if (!current) {
          this.usernameWasEditedManually = false;
          return;
        }

        this.usernameWasEditedManually = current !== this.lastSuggestedUsername;
      });
  }

  private syncUsernameSuggestion(): void {
    if (this.editingUserId()) {
      return;
    }

    const currentUsername = this.form.controls.username.value.trim();
    if (this.usernameWasEditedManually && currentUsername) {
      return;
    }

    const suggestion = this.buildBaseUsernamePreview();
    this.lastSuggestedUsername = suggestion;
    this.form.controls.username.setValue(suggestion, { emitEvent: false });
  }

  private toPayload(): AdministrationUserFormValue {
    const firstName = [this.form.controls.firstName.value, this.form.controls.secondName.value]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' ');

    return {
      username: this.form.controls.username.value.trim(),
      firstName,
      paternalLastName: this.form.controls.paternalLastName.value.trim(),
      maternalLastName: this.form.controls.maternalLastName.value.trim(),
      email: this.form.controls.email.value.trim(),
      run: this.form.controls.run.value.trim(),
      phone: this.form.controls.phone.value.trim(),
      initialStatus: this.form.controls.initialStatus.value,
      roleCode: this.form.controls.roleCode.value,
      temporaryPassword: this.form.controls.temporaryPassword.value.trim(),
      forcePasswordChange: this.form.controls.forcePasswordChange.value,
      twoFactorRequired: this.form.controls.twoFactorMode.value === this.twoFactorModes.REQUIRED,
      accountExpiresAt: this.resolveAccountExpiresAt()
    };
  }

  private resolveAccountExpiresAt(): string | null {
    const mode = this.form.controls.accountExpiryMode.value;
    const today = new Date();

    switch (mode) {
      case this.expiryModes.MONTH_1:
        return this.formatDate(this.addMonths(today, 1));
      case this.expiryModes.MONTH_6:
        return this.formatDate(this.addMonths(today, 6));
      case this.expiryModes.YEAR_END:
        return `${today.getFullYear()}-12-31`;
      case this.expiryModes.CUSTOM:
        return this.form.controls.customAccountExpiresAt.value || null;
      case this.expiryModes.NONE:
      default:
        return null;
    }
  }

  private splitGivenNames(value: string): { primaryName: string; secondaryName: string } {
    const parts = normalizeWhitespace(value).split(' ').filter(Boolean);
    return {
      primaryName: parts[0] ?? '',
      secondaryName: parts.slice(1).join(' ')
    };
  }

  private buildBaseUsernamePreview(): string {
    const firstName = this.normalizeAccessPart([this.form.controls.firstName.value, this.form.controls.secondName.value].join(' '))
      .split(/\s+/)
      .filter(Boolean)[0] ?? '';
    const paternalLastName = this.normalizeAccessPart(this.form.controls.paternalLastName.value);

    let candidate = `${firstName.charAt(0)}${paternalLastName}`.toLowerCase();
    if (!candidate) {
      candidate = 'usuario';
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

  private detectExpiryMode(value: string | null): AccountExpiryMode {
    if (!value) {
      return this.expiryModes.NONE;
    }

    const today = new Date();
    const formattedOneMonth = this.formatDate(this.addMonths(today, 1));
    const formattedSixMonths = this.formatDate(this.addMonths(today, 6));
    const endOfYear = `${today.getFullYear()}-12-31`;

    if (value === formattedOneMonth) {
      return this.expiryModes.MONTH_1;
    }
    if (value === formattedSixMonths) {
      return this.expiryModes.MONTH_6;
    }
    if (value === endOfYear) {
      return this.expiryModes.YEAR_END;
    }

    return this.expiryModes.CUSTOM;
  }

  private addMonths(baseDate: Date, months: number): Date {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    date.setMonth(date.getMonth() + months);
    return date;
  }

  private formatDate(value: Date): string {
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }

  private resolveStatusTone(status: AdministrationUserStatus): 'success' | 'danger' | 'warning' | 'neutral' {
    switch (status) {
      case 'Activo':
        return 'success';
      case 'Bloqueado':
        return 'danger';
      case 'Pendiente':
        return 'warning';
      case 'Inactivo':
      default:
        return 'neutral';
    }
  }

  getControlError(
    controlName:
      | 'firstName'
      | 'username'
      | 'secondName'
      | 'paternalLastName'
      | 'email'
      | 'run'
      | 'phone'
      | 'initialStatus'
      | 'roleCode'
  ): string {
    const control = this.form.controls[controlName];
    if (!control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('email')) {
      return 'Ingresa un email valido.';
    }
    if (control.hasError('minlength')) {
      return 'Ingresa al menos 2 caracteres.';
    }
    if (control.hasError('pattern')) {
      if (controlName === 'run') {
        return 'Usa formato 12.345.678-9.';
      }
      if (controlName === 'phone') {
        return 'Usa formato +56 9 1234 5678.';
      }
      if (controlName === 'username') {
        return 'Usa al menos 3 caracteres sin espacios.';
      }
    }
    return 'Revisa este campo.';
  }

  private formatChileanMobile(rawValue: string): string {
    const digits = rawValue.replace(/\D/g, '');
    if (!digits) {
      return '';
    }

    let normalized = digits;
    if (normalized.startsWith('56')) {
      normalized = normalized.slice(2);
    }
    if (normalized.startsWith('9')) {
      normalized = normalized.slice(1);
    }

    normalized = normalized.slice(0, 8);

    const first = normalized.slice(0, 4);
    const second = normalized.slice(4, 8);

    if (!first) {
      return '+56 9';
    }
    if (!second) {
      return `+56 9 ${first}`;
    }
    return `+56 9 ${first} ${second}`;
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

type AccountExpiryMode = 'none' | 'month_1' | 'month_6' | 'year_end' | 'custom';
type TwoFactorMode = 'OPTIONAL' | 'REQUIRED' | 'DISABLED';
