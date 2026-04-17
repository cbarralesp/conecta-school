import { HttpErrorResponse } from '@angular/common/http';
import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { ScheduleApiService } from '../../../core/services/schedule-api.service';
import { ScheduleBlock, ScheduleCatalog, ScheduleEntry } from '../../../core/models/schedule.models';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';
import { ScheduleDialogComponent } from '../components/schedule-dialog.component';

type DayKey = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES';

interface GridRow {
  order: number;
  blockType: string;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-schedule-page',
  imports: [
    NgStyle,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './schedule-page.component.html',
  styleUrl: './schedule-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchedulePageComponent {
  @ViewChild('pdfSchedule') private pdfScheduleRef?: ElementRef<HTMLElement>;

  private readonly scheduleApiService = inject(ScheduleApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly days: DayKey[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
  readonly user = this.authStateService.user;
  readonly catalog = signal<ScheduleCatalog | null>(null);
  readonly selectedCourseId = signal<number | null>(null);
  readonly scheduleEntries = signal<ScheduleEntry[]>([]);
  readonly isExportingPdf = signal(false);
  readonly headingDate = this.formatTodayHeader();

  readonly selectedCourse = computed(() =>
    this.catalog()?.courses.find((course) => course.id === this.selectedCourseId()) ?? null
  );

  readonly orderedCourses = computed(() => {
    const courses = [...(this.catalog()?.courses ?? [])];
    return courses.sort((left, right) => this.courseSortWeight(left.name) - this.courseSortWeight(right.name));
  });

  readonly gridRows = computed<GridRow[]>(() => {
    const blocks = this.catalog()?.blocks ?? [];
    const unique = new Map<number, GridRow>();
    for (const block of blocks) {
      if (!unique.has(block.order)) {
        unique.set(block.order, {
          order: block.order,
          blockType: block.blockType,
          startTime: block.startTime,
          endTime: block.endTime
        });
      }
    }
    return Array.from(unique.values()).sort((left, right) => left.order - right.order);
  });

  readonly subjectSummaries = computed(() => {
    const summaries = new Map<string, { name: string; colorHex: string; blocks: number }>();
    for (const entry of this.scheduleEntries()) {
      const current = summaries.get(entry.subjectCode);
      if (current) {
        current.blocks += 1;
      } else {
        summaries.set(entry.subjectCode, {
          name: entry.subjectName,
          colorHex: entry.subjectColorHex,
          blocks: 1
        });
      }
    }

    return Array.from(summaries.values()).sort((left, right) => right.blocks - left.blocks);
  });

  readonly teacherSummaries = computed(() => {
    const summaries = new Map<string, { name: string; specialty: string | undefined }>();
    const teachers = new Map((this.catalog()?.teachers ?? []).map((teacher) => [teacher.id, teacher]));
    for (const entry of this.scheduleEntries()) {
      if (!summaries.has(entry.teacherCode)) {
        summaries.set(entry.teacherCode, {
          name: entry.teacherFullName,
          specialty: teachers.get(entry.teacherId)?.specialty
        });
      }
    }
    return Array.from(summaries.values());
  });

  constructor() {
    this.loadCatalog();
  }

  selectCourse(courseId: number): void {
    if (this.selectedCourseId() === courseId) {
      return;
    }
    this.selectedCourseId.set(courseId);
    this.loadSchedule(courseId);
  }

  openCreateDialog(blockId?: number): void {
    const catalog = this.catalog();
    if (!catalog || !this.selectedCourseId()) {
      return;
    }

    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '780px',
      maxWidth: '84vw',
      autoFocus: false,
      data: {
        catalog,
        presetCourseId: this.selectedCourseId(),
        presetBlockId: blockId ?? null
      }
    });

    dialogRef.afterClosed().subscribe((result?: { payload?: any; delete?: boolean }) => {
      if (!result?.payload) {
        return;
      }

      this.scheduleApiService.create(result.payload).subscribe({
        next: () => {
          this.snackBar.open('Horario creado correctamente', 'Cerrar', { duration: 2500 });
          this.reloadSelectedCourse();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible crear el horario')
      });
    });
  }

  async downloadSchedulePdf(): Promise<void> {
    const course = this.selectedCourse();
    const exportTarget = this.pdfScheduleRef?.nativeElement;
    if (!course || !exportTarget || this.gridRows().length === 0) {
      this.snackBar.open('El horario todavia no esta listo para exportar', 'Cerrar', { duration: 2600 });
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
      pdf.save(this.buildPdfFileName(course.name, course.schoolYear));
      this.snackBar.open('Horario descargado en PDF', 'Cerrar', { duration: 2600 });
    } catch {
      this.snackBar.open('No fue posible generar el PDF del horario', 'Cerrar', { duration: 3200 });
    } finally {
      this.isExportingPdf.set(false);
    }
  }

  openEditDialog(entry: ScheduleEntry): void {
    const catalog = this.catalog();
    if (!catalog) {
      return;
    }

    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '780px',
      maxWidth: '84vw',
      autoFocus: false,
      data: { catalog, schedule: entry }
    });

    dialogRef.afterClosed().subscribe((result?: { payload?: any; delete?: boolean }) => {
      if (!result) {
        return;
      }

      if (result.delete) {
        const ref = this.snackBar.open(`Eliminar ${entry.subjectName} de ${entry.dayOfWeek}?`, 'Confirmar', {
          duration: 5000
        });
        ref.onAction().subscribe(() => {
          this.scheduleApiService.delete(entry.id).subscribe({
            next: () => {
              this.snackBar.open('Horario eliminado correctamente', 'Cerrar', { duration: 2500 });
              this.reloadSelectedCourse();
            },
            error: (error: HttpErrorResponse) =>
              this.showError(error, 'No fue posible eliminar el horario')
          });
        });
        return;
      }

      if (!result.payload) {
        return;
      }

      this.scheduleApiService.update(entry.id, result.payload).subscribe({
        next: () => {
          this.snackBar.open('Horario actualizado correctamente', 'Cerrar', { duration: 2500 });
          this.reloadSelectedCourse();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible actualizar el horario')
      });
    });
  }

  blockFor(day: DayKey, order: number): ScheduleBlock | undefined {
    return this.catalog()?.blocks.find((block) => block.dayOfWeek === day && block.order === order);
  }

  entryFor(day: DayKey, order: number): ScheduleEntry | undefined {
    const block = this.blockFor(day, order);
    return block ? this.scheduleEntries().find((entry) => entry.blockId === block.id) : undefined;
  }

  slotStyles(entry: ScheduleEntry): Record<string, string> {
    return {
      background: this.toRgba(entry.subjectColorHex, 0.95),
      color: '#173553'
    };
  }

  private loadCatalog(): void {
    this.scheduleApiService.getCatalog().subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        const firstCourseId = catalog.courses[0]?.id ?? null;
        this.selectedCourseId.set(firstCourseId);
        if (firstCourseId) {
          this.loadSchedule(firstCourseId);
        }
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar el catalogo horario')
    });
  }

  private loadSchedule(courseId: number): void {
    this.scheduleApiService.getByCourse(courseId).subscribe({
      next: (entries) => this.scheduleEntries.set(entries),
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar el horario')
    });
  }

  private reloadSelectedCourse(): void {
    const courseId = this.selectedCourseId();
    if (courseId) {
      this.loadSchedule(courseId);
    }
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(
      typeof error.error?.message === 'string' ? error.error.message : fallback,
      'Cerrar',
      { duration: 3500 }
    );
  }

  toRgba(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '');
    const value = Number.parseInt(normalized, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private buildPdfFileName(courseName: string, schoolYear: number): string {
    return `horario-${courseName.toLowerCase().replaceAll(' ', '-').replaceAll('°', '').replaceAll('/', '-')}-${schoolYear}.pdf`;
  }

  private formatTodayHeader(): string {
    const formatter = new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const parts = formatter.formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<string, string>;
    const weekday = this.capitalizeWord(values['weekday'] ?? '');
    const month = values['month'] ?? '';

    return `${weekday}, ${values['day'] ?? ''} de ${month} de ${values['year'] ?? ''}`.trim();
  }

  private capitalizeWord(value: string): string {
    if (!value) {
      return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private courseSortWeight(name: string): number {
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (normalized.includes('PK') || normalized.includes('PRE KINDER') || normalized.includes('PREKINDER')) {
      return 0;
    }

    if (normalized.includes('KINDER') || normalized.includes('KINDER')) {
      return 1;
    }

    const groupedMatches: Array<[RegExp, number]> = [
      [/1/, 2],
      [/2/, 3],
      [/3/, 4],
      [/4/, 5],
      [/5/, 6],
      [/6/, 7],
      [/7/, 8],
      [/8/, 9]
    ];

    for (const [pattern, weight] of groupedMatches) {
      if (pattern.test(normalized)) {
        return weight;
      }
    }

    return 99;
  }
}
