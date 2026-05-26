import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, forkJoin, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherApiService } from '../../../core/services/teacher-api.service';
import { Subject } from '../../../core/models/subject.models';
import { TeacherListItem, TeacherOverview, TeacherSummary } from '../../../core/models/teacher.models';
import { SummaryMetricCardComponent } from '../../../shared/summary-metric-card.component';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';
import { TeacherDeleteDialogComponent } from '../components/teacher-delete-dialog.component';

@Component({
  selector: 'app-teachers-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    SummaryMetricCardComponent,
    TeacherModernLayoutComponent
  ],
  templateUrl: './teachers-page.component.html',
  styleUrl: './teachers-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeachersPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly teacherApiService = inject(TeacherApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly user = this.authStateService.user;
  readonly displayedColumns = ['teacher', 'run', 'subjects', 'workday', 'status', 'actions'];
  readonly overview = signal<TeacherOverview | null>(null);
  readonly isLoading = signal(true);
  readonly isExporting = signal(false);
  readonly viewMode = signal<'cards' | 'table'>('table');
  readonly filtersForm = this.formBuilder.nonNullable.group({
    search: [''],
    subjectId: [0],
    status: ['ACTIVO']
  });

  readonly summary = computed<TeacherSummary>(() => this.overview()?.summary ?? {
    totalTeachers: 0,
    activeTeachers: 0,
    subjectCount: 0,
    fullTimeTeachers: 0
  });
  readonly subjectOptions = computed<Subject[]>(() => this.overview()?.subjects ?? []);
  readonly teachers = computed<TeacherListItem[]>(() => this.overview()?.teachers ?? []);

  constructor() {
    this.loadOverview();
    this.filtersForm.valueChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => this.loadOverview());
  }

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }

  goToCreate(): void {
    void this.router.navigate(['/dashboard/profesores/nuevo']);
  }

  goToCreateAssistant(): void {
    void this.router.navigate(['/dashboard/profesores/nuevo-asistente']);
  }

  exportJson(): void {
    if (this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    const currentFilters = {
      search: this.filtersForm.controls.search.value,
      subjectId: this.filtersForm.controls.subjectId.value || null,
      status: this.filtersForm.controls.status.value || null
    };

    this.teacherApiService.getOverview(currentFilters).pipe(
      switchMap((overview) => {
        if (overview.teachers.length === 0) {
          return of({ overview, details: [] });
        }

        return forkJoin(
          overview.teachers.map((teacher) => this.teacherApiService.getById(teacher.id))
        ).pipe(
          switchMap((details) => of({ overview, details }))
        );
      })
    ).subscribe({
      next: ({ overview, details }) => {
        if (details.length === 0) {
          this.isExporting.set(false);
          this.snackBar.open('No hay docentes para exportar con los filtros actuales', 'Cerrar', {
            duration: 2800
          });
          return;
        }

        const exportPayload = {
          generatedAt: new Date().toISOString(),
          generatedBy: this.user()?.nombre ?? 'Usuario',
          filters: {
            search: currentFilters.search?.trim() || '',
            status: currentFilters.status || 'TODOS',
            subjectId: currentFilters.subjectId
          },
          summary: overview.summary,
          totalRecords: details.length,
          teachers: details
        };

        this.downloadJsonFile(exportPayload);
        this.isExporting.set(false);
        this.snackBar.open('JSON descargado correctamente', 'Cerrar', {
          duration: 2400
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isExporting.set(false);
        this.showError(error, 'No fue posible exportar los docentes en JSON');
      }
    });
  }

  goToDetail(teacherId: number): void {
    void this.router.navigate(['/dashboard/profesores', teacherId]);
  }

  goToEdit(teacherId: number): void {
    void this.router.navigate(['/dashboard/profesores', teacherId, 'editar']);
  }

  changeView(view: 'cards' | 'table'): void {
    this.viewMode.set(view);
  }

  confirmDelete(item: TeacherListItem): void {
    const dialogRef = this.dialog.open(TeacherDeleteDialogComponent, {
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      data: { fullName: item.fullName }
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
          this.teacherApiService.delete(item.id).subscribe({
        next: () => {
          this.snackBar.open('Docente eliminado correctamente', 'Cerrar', { duration: 2600 });
          this.loadOverview();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible eliminar el docente')
      });
    });
  }

  initials(fullName: string): string {
    const parts = fullName.split(' ').filter(Boolean);
    return `${parts[0]?.charAt(0) ?? ''}${parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? ''}`.toUpperCase();
  }

  workdayLabel(item: TeacherListItem): string {
    return `${item.contractType} - ${item.weeklyHours}h`;
  }

  buildDisabledExportMessage(format: 'excel' | 'word' | 'pdf'): string {
    const label = format.toUpperCase();
    return `${label} estara disponible proximamente. Por ahora puedes usar JSON.`;
  }

  private loadOverview(): void {
    this.isLoading.set(true);
    this.teacherApiService.getOverview({
      search: this.filtersForm.controls.search.value,
      subjectId: this.filtersForm.controls.subjectId.value || null,
      status: this.filtersForm.controls.status.value || null
    }).subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.overview.set(null);
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar los docentes');
      }
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }

  private downloadJsonFile(payload: unknown): void {
    const fileName = this.buildExportFileName();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private buildExportFileName(): string {
    const now = new Date();
    const date = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
    return `docentes-export-${date}.json`;
  }
}

