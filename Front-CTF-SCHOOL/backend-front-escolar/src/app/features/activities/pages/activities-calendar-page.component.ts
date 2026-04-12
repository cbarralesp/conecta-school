import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';
import { ActivityCalendarApiService } from '../../../core/services/activity-calendar-api.service';
import {
  ActivityCalendar,
  CreateSchoolActivityRequest,
  SchoolActivity
} from '../../../core/models/activity-calendar.models';
import { ActivityDialogComponent } from '../components/activity-dialog.component';

interface CalendarDay {
  isoDate: string;
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  activities: SchoolActivity[];
}

@Component({
  selector: 'app-activities-calendar-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatToolbarModule,
    TeacherSideMenuComponent
  ],
  templateUrl: './activities-calendar-page.component.html',
  styleUrl: './activities-calendar-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivitiesCalendarPageComponent {
  @ViewChild('pdfCalendar') private pdfCalendarRef?: ElementRef<HTMLElement>;

  private readonly authStateService = inject(AuthStateService);
  private readonly activityCalendarApiService = inject(ActivityCalendarApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  private readonly today = new Date();

  readonly isLoading = signal(false);
  readonly isExportingPdf = signal(false);
  readonly calendar = signal<ActivityCalendar | null>(null);
  readonly visibleYear = signal(this.today.getFullYear());
  readonly visibleMonth = signal(this.today.getMonth() + 1);

  readonly weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  readonly calendarDays = computed(() => {
    const calendar = this.calendar();
    if (!calendar) {
      return [] as CalendarDay[];
    }

    const monthIndex = calendar.month - 1;
    const firstDay = new Date(calendar.year, monthIndex, 1);
    const lastDay = new Date(calendar.year, monthIndex + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(calendar.year, monthIndex, 1 - startOffset);
    const endOffset = 6 - ((lastDay.getDay() + 6) % 7);
    const endDate = new Date(calendar.year, monthIndex, lastDay.getDate() + endOffset);

    const days: CalendarDay[] = [];
    for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
      const currentDate = new Date(cursor);
      const isoDate = this.toIsoDate(currentDate);
      days.push({
        isoDate,
        date: currentDate,
        inCurrentMonth: currentDate.getMonth() === monthIndex,
        isToday: isoDate === this.toIsoDate(this.today),
        activities: calendar.monthlyActivities.filter((activity) => this.activityCoversDay(activity, isoDate))
      });
    }

    return days;
  });

  readonly monthGrid = computed(() => {
    const days = this.calendarDays();
    return Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => days.slice(index * 7, index * 7 + 7));
  });

  constructor() {
    this.loadCalendar();
  }

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }

  goToToday(): void {
    this.visibleYear.set(this.today.getFullYear());
    this.visibleMonth.set(this.today.getMonth() + 1);
    this.loadCalendar();
  }

  goToPreviousMonth(): void {
    const current = new Date(this.visibleYear(), this.visibleMonth() - 1, 1);
    current.setMonth(current.getMonth() - 1);
    this.visibleYear.set(current.getFullYear());
    this.visibleMonth.set(current.getMonth() + 1);
    this.loadCalendar();
  }

  goToNextMonth(): void {
    const current = new Date(this.visibleYear(), this.visibleMonth() - 1, 1);
    current.setMonth(current.getMonth() + 1);
    this.visibleYear.set(current.getFullYear());
    this.visibleMonth.set(current.getMonth() + 1);
    this.loadCalendar();
  }

  async downloadCurrentMonthPdf(): Promise<void> {
    const calendar = this.calendar();
    const exportTarget = this.pdfCalendarRef?.nativeElement;
    if (!calendar || !exportTarget || this.monthGrid().length === 0) {
      this.snackBar.open('El calendario todavia no esta listo para exportar', 'Cerrar', { duration: 2600 });
      return;
    }

    try {
      this.isExportingPdf.set(true);

      const canvas = await html2canvas(exportTarget, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const scale = Math.min(printableWidth / canvas.width, printableHeight / canvas.height);
      const renderedWidth = canvas.width * scale;
      const renderedHeight = canvas.height * scale;
      const x = (pageWidth - renderedWidth) / 2;
      const y = (pageHeight - renderedHeight) / 2;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, renderedWidth, renderedHeight, undefined, 'FAST');
      pdf.save(this.buildPdfFileName(calendar.monthLabel));

      this.snackBar.open('Calendario descargado en PDF', 'Cerrar', { duration: 2600 });
    } catch {
      this.snackBar.open('No fue posible generar el PDF del calendario', 'Cerrar', { duration: 3200 });
    } finally {
      this.isExportingPdf.set(false);
    }
  }

  openNewActivityDialog(selectedDate?: string): void {
    const calendar = this.calendar();
    if (!calendar) {
      return;
    }

    const dialogRef = this.dialog.open(ActivityDialogComponent, {
      data: { activityTypes: calendar.activityTypes, selectedDate },
      width: '860px',
      maxWidth: '84vw',
      maxHeight: '88vh',
      autoFocus: false,
      panelClass: 'course-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result?: { action: 'save'; payload: CreateSchoolActivityRequest } | { action: 'delete' }) => {
      if (!result || result.action !== 'save') {
        return;
      }

      this.activityCalendarApiService.createActivity(result.payload).subscribe({
        next: () => {
          this.snackBar.open('Actividad creada correctamente', 'Cerrar', { duration: 2800 });
          this.loadCalendar();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible crear la actividad')
      });
    });
  }

  openEditActivityDialog(activity: SchoolActivity): void {
    const calendar = this.calendar();
    if (!calendar) {
      return;
    }

    const dialogRef = this.dialog.open(ActivityDialogComponent, {
      data: { activityTypes: calendar.activityTypes, activity },
      width: '860px',
      maxWidth: '84vw',
      maxHeight: '88vh',
      autoFocus: false,
      panelClass: 'course-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result?: { action: 'save'; payload: CreateSchoolActivityRequest } | { action: 'delete' }) => {
      if (!result) {
        return;
      }

      if (result.action === 'delete') {
        this.deleteActivity(activity);
        return;
      }

      this.activityCalendarApiService.updateActivity(activity.id, result.payload).subscribe({
        next: () => {
          this.snackBar.open('Actividad actualizada correctamente', 'Cerrar', { duration: 2800 });
          this.loadCalendar();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible actualizar la actividad')
      });
    });
  }

  deleteActivity(activity: SchoolActivity): void {
    const ref = this.snackBar.open(`Eliminar ${activity.title}?`, 'Confirmar', { duration: 5000 });
    ref.onAction().subscribe(() => {
      this.activityCalendarApiService.deleteActivity(activity.id).subscribe({
        next: () => {
          this.snackBar.open('Actividad eliminada correctamente', 'Cerrar', { duration: 2600 });
          this.loadCalendar();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible eliminar la actividad')
      });
    });
  }

  formatTime(time: string | null): string {
    if (!time) {
      return 'Todo el dia';
    }
    return time.slice(0, 5);
  }

  formatShortDate(date: string): string {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short'
    })
      .format(new Date(`${date}T00:00:00`))
      .replace('.', '')
      .toUpperCase();
  }

  private loadCalendar(): void {
    this.isLoading.set(true);

    this.activityCalendarApiService.getCalendar(this.visibleYear(), this.visibleMonth()).subscribe({
      next: (calendar) => {
        this.calendar.set(calendar);
        this.visibleYear.set(calendar.year);
        this.visibleMonth.set(calendar.month);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el calendario de actividades');
      }
    });
  }

  private activityCoversDay(activity: SchoolActivity, isoDate: string): boolean {
    const endDate = activity.endDate ?? activity.date;
    return activity.date <= isoDate && endDate >= isoDate;
  }

  private toIsoDate(date: Date): string {
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }

  private buildPdfFileName(monthLabel: string): string {
    return `calendario-${monthLabel.toLowerCase().replaceAll(' ', '-')}.pdf`;
  }
}
