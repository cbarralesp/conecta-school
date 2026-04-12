import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdministrationAuditLogView, AdministrationAuditType } from '../../../core/models/administration.models';
import { AdministrationApiService } from '../../../core/services/administration-api.service';
import { AdministrationHeroComponent } from '../components/administration-hero.component';
import { AdministrationShellComponent } from '../components/administration-shell.component';

@Component({
  selector: 'app-administration-audit-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSnackBarModule,
    AdministrationHeroComponent,
    AdministrationShellComponent
  ],
  templateUrl: './administration-audit-page.component.html',
  styleUrl: './administration-audit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationAuditPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly administrationApi = inject(AdministrationApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly view = signal<AdministrationAuditLogView | null>(null);
  readonly filtersForm = this.fb.nonNullable.group({
    type: ['' as '' | AdministrationAuditType],
    user: [''],
    date: ['']
  });

  constructor() {
    this.loadAudit();
    this.filtersForm.valueChanges.pipe(debounceTime(200), distinctUntilChanged()).subscribe(() => this.loadAudit());
  }

  exportLogs(): void {
    this.administrationApi.exportAuditLogs({
      type: this.filtersForm.controls.type.value,
      user: this.filtersForm.controls.user.value,
      date: this.filtersForm.controls.date.value || null
    }).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'auditoria-sistema.csv';
      link.click();
      URL.revokeObjectURL(url);
      this.snackBar.open('Log exportado correctamente', 'Cerrar', { duration: 2400 });
    });
  }

  eventClass(type: string): string {
    switch (type) {
      case 'LOGIN': return 'is-login';
      case 'CREATE': return 'is-create';
      case 'ROLE_CHANGE': return 'is-role-change';
      case 'BLOCK': return 'is-block';
      case 'FAILED_ATTEMPT': return 'is-failed';
      case 'LOGOUT': return 'is-logout';
      default: return 'is-default';
    }
  }

  private loadAudit(): void {
    this.administrationApi.getAuditLogs({
      type: this.filtersForm.controls.type.value,
      user: this.filtersForm.controls.user.value,
      date: this.filtersForm.controls.date.value || null
    }).subscribe({
      next: (view) => this.view.set(view),
      error: (error: HttpErrorResponse) => this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : 'No fue posible cargar la auditoria', 'Cerrar', { duration: 2600 })
    });
  }
}
