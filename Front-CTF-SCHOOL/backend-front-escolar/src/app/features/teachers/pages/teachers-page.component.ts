import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherApiService } from '../../../core/services/teacher-api.service';
import { Subject } from '../../../core/models/subject.models';
import { TeacherListItem, TeacherOverview, TeacherSummary } from '../../../core/models/teacher.models';
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
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
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
  readonly viewMode = signal<'cards' | 'table'>('table');
  readonly filtersForm = this.formBuilder.nonNullable.group({
    search: [''],
    subjectId: [0],
    status: ['']
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
          this.snackBar.open('Profesor eliminado correctamente', 'Cerrar', { duration: 2600 });
          this.loadOverview();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible eliminar el profesor')
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
        this.showError(error, 'No fue posible cargar los profesores');
      }
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}

