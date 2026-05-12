import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdministrationAuditLogItem, AdministrationAuditLogView, AdministrationAuditType } from '../../../core/models/administration.models';
import { AdministrationApiService } from '../../../core/services/administration-api.service';
import { AdministrationShellComponent } from '../components/administration-shell.component';
import { SummaryMetricCardComponent } from '../../../shared/summary-metric-card.component';

@Component({
  selector: 'app-administration-audit-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    MatSnackBarModule,
    AdministrationShellComponent,
    SummaryMetricCardComponent
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
  readonly isLoading = signal(true);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly filtersForm = this.fb.nonNullable.group({
    type: ['' as '' | AdministrationAuditType],
    user: [''],
    dateStart: [''],
    dateEnd: ['']
  });

  readonly summaryCards = computed(() => {
    const items = this.view()?.items ?? [];
    const today = items.filter((item) => item.occurredLabel.startsWith('Hoy')).length;
    const warnings = items.filter((item) => this.statusMeta(item).toneClass === 'warning').length;

    return [
      { label: 'Eventos visibles', value: items.length, icon: 'shield', toneClass: 'sc-blue' },
      { label: 'Actividad hoy', value: today, icon: 'today', toneClass: 'sc-green' },
      { label: 'Usuarios en log', value: new Set(items.map((item) => item.userDisplay)).size, icon: 'groups', toneClass: 'sc-violet' },
      { label: 'Alertas', value: warnings, icon: 'warning', toneClass: 'sc-amber' }
    ];
  });
  readonly pagedItems = computed(() => {
    const items = this.view()?.items ?? [];
    const start = this.pageIndex() * this.pageSize();
    return items.slice(start, start + this.pageSize());
  });
  readonly totalItems = computed(() => this.view()?.items?.length ?? 0);
  readonly shouldShowPaginator = computed(() => this.totalItems() > this.pageSize());

  constructor() {
    this.loadAudit();
  }

  applyFilters(): void {
    this.pageIndex.set(0);
    this.loadAudit();
  }

  resetFilters(): void {
    this.filtersForm.reset({
      type: '',
      user: '',
      dateStart: '',
      dateEnd: ''
    });
    this.pageIndex.set(0);
    this.loadAudit();
  }

  handlePageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  exportLogs(): void {
    this.administrationApi.exportAuditLogs({
      type: this.filtersForm.controls.type.value,
      user: this.filtersForm.controls.user.value,
      dateStart: this.filtersForm.controls.dateStart.value || null,
      dateEnd: this.filtersForm.controls.dateEnd.value || null
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'auditoria-sistema.csv';
        link.click();
        URL.revokeObjectURL(url);
        this.snackBar.open('Log exportado correctamente', 'Cerrar', { duration: 2400 });
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible exportar la auditoria')
    });
  }

  iconFor(item: AdministrationAuditLogItem): string {
    switch (item.type) {
      case 'LOGIN':
        return 'login';
      case 'CREATE':
        return 'add_circle';
      case 'ROLE_CHANGE':
        return 'edit_square';
      case 'BLOCK':
        return 'block';
      case 'FAILED_ATTEMPT':
        return 'warning';
      case 'LOGOUT':
        return 'logout';
      default:
        return 'history';
    }
  }

  statusMeta(item: AdministrationAuditLogItem): { toneClass: 'success' | 'warning'; label: string } {
    if (item.type === 'FAILED_ATTEMPT' || item.type === 'BLOCK') {
      return { toneClass: 'warning', label: item.context };
    }
    return { toneClass: 'success', label: item.context };
  }

  rolePillClass(roleName: string): string {
    const normalized = roleName.trim().toLowerCase();
    if (normalized.includes('profesor')) {
      return 'role-pill role-pill--teacher';
    }
    if (normalized.includes('director')) {
      return 'role-pill role-pill--director';
    }
    if (normalized.includes('superadmin')) {
      return 'role-pill role-pill--superadmin';
    }
    if (normalized.includes('alumno') || normalized.includes('apoderado')) {
      return 'role-pill role-pill--guardian';
    }
    return 'role-pill role-pill--admin';
  }

  trackByAuditId(_: number, item: AdministrationAuditLogItem): number {
    return item.id;
  }

  private loadAudit(): void {
    this.isLoading.set(true);
    this.administrationApi.getAuditLogs({
      type: this.filtersForm.controls.type.value,
      user: this.filtersForm.controls.user.value,
      dateStart: this.filtersForm.controls.dateStart.value || null,
      dateEnd: this.filtersForm.controls.dateEnd.value || null
    }).subscribe({
      next: (view) => {
        this.view.set(view);
        const maxPageIndex = Math.max(0, Math.ceil((view.items.length || 1) / this.pageSize()) - 1);
        if (this.pageIndex() > maxPageIndex) {
          this.pageIndex.set(maxPageIndex);
        }
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar la auditoria');
      }
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 2600
    });
  }
}
