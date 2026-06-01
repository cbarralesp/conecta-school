import { HttpErrorResponse } from '@angular/common/http';
import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { ScheduleApiService } from '../../../core/services/schedule-api.service';
import { ScheduleBlock, ScheduleBlockType, ScheduleCatalog, ScheduleEntry, SchedulePeriodOption } from '../../../core/models/schedule.models';
import { SummaryMetricCardComponent } from '../../../shared/summary-metric-card.component';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';
import {
  ScheduleDialogCloseResult,
  ScheduleDialogComponent,
  ScheduleRowDraft
} from '../components/schedule-dialog.component';

type DayKey = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES';

interface ScheduleBoardRow {
  rowKey: string;
  order: number;
  startTime: string;
  endTime: string;
  blockType: 'CLASE' | 'RECREO';
  isCustom: boolean;
  sourceOrder: number | null;
}

@Component({
  selector: 'app-schedule-page',
  imports: [
    NgStyle,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,
    SummaryMetricCardComponent,
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
  readonly selectedSemesterId = signal<number | null>(null);
  readonly scheduleEntries = signal<ScheduleEntry[]>([]);
  readonly isExportingPdf = signal(false);
  readonly isPreviewOpen = signal(false);

  readonly selectedCourse = computed(() =>
    this.catalog()?.courses.find((course) => course.id === this.selectedCourseId()) ?? null
  );

  readonly periodOptions = computed<SchedulePeriodOption[]>(() => this.catalog()?.periods ?? []);

  readonly selectedSemesterLabel = computed(
    () => this.periodOptions().find((period) => period.id === this.selectedSemesterId())?.name ?? 'Periodo academico'
  );

  readonly orderedCourses = computed(() => {
    const courses = [...(this.catalog()?.courses ?? [])];
    return courses.sort((left, right) => this.courseSortWeight(left.name) - this.courseSortWeight(right.name));
  });

  readonly boardRows = computed<ScheduleBoardRow[]>(() => {
    const blocks = this.catalog()?.blocks ?? [];
    const baseRows = new Map<number, ScheduleBoardRow>();
    for (const block of blocks) {
      if (!baseRows.has(block.order)) {
        baseRows.set(block.order, {
          rowKey: `base-${block.order}`,
          order: block.order,
          startTime: block.startTime,
          endTime: block.endTime,
          blockType: block.blockType === 'RECREO' ? 'RECREO' : 'CLASE',
          isCustom: false,
          sourceOrder: block.order
        });
      }
    }

    return Array.from(baseRows.values()).sort((left, right) => {
      const startDiff = this.timeToMinutes(left.startTime) - this.timeToMinutes(right.startTime);
      if (startDiff !== 0) {
        return startDiff;
      }

      const endDiff = this.timeToMinutes(left.endTime) - this.timeToMinutes(right.endTime);
      if (endDiff !== 0) {
        return endDiff;
      }

      return left.order - right.order;
    });
  });

  readonly scheduledClassCount = computed(() => this.scheduleEntries().length);

  readonly scheduledTeacherCount = computed(() => {
    const unique = new Set(this.scheduleEntries().map((entry) => entry.teacherId));
    return unique.size;
  });

  readonly scheduledBreakCount = computed(() => this.boardRows().filter((row) => row.blockType === 'RECREO').length);

  readonly pedagogicalLoad = computed(() => {
    const totalMinutes = this.scheduleEntries().reduce((sum, entry) => sum + this.durationForOrder(entry.order), 0);
    return this.formatMinutes(totalMinutes);
  });

  readonly currentBoardTitle = computed(() => {
    const course = this.selectedCourse();
    if (!course) {
      return 'Horario escolar';
    }
    return `${course.name} - ${this.selectedSemesterLabel()}`;
  });

  readonly currentBoardSubtitle = computed(() => {
    const course = this.selectedCourse();
    if (!course) {
      return 'Selecciona un curso para organizar el horario semanal.';
    }
    return `Organiza, ajusta y exporta el horario de ${course.name}.`;
  });

  constructor() {
    this.loadCatalog();
  }

  shortTeacherName(fullName: string): string {
    const parts = fullName.split(' ').filter(Boolean);
    if (parts.length <= 1) {
      return fullName;
    }
    if (parts.length === 2) {
      return `${parts[0]} ${parts[1]}`;
    }

    return `${parts[0]} ${parts[parts.length - 2]}`;
  }

  updateCourse(courseId: number | null): void {
    if (!courseId || this.selectedCourseId() === courseId) {
      return;
    }
    this.selectedCourseId.set(courseId);
    this.reloadCatalogAndCourse();
  }

  updateSemester(periodId: number | null): void {
    this.selectedSemesterId.set(periodId);
    this.reloadSelectedCourse();
  }

  openCreateDialog(blockId?: number): void {
    const catalog = this.catalog();
    const courseId = this.selectedCourseId();
    if (!catalog || !courseId) {
      return;
    }

    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '780px',
      maxWidth: '84vw',
      autoFocus: false,
      panelClass: 'schedule-dialog-panel',
      backdropClass: 'schedule-dialog-backdrop',
      data: {
        mode: 'entry-create',
        catalog,
        presetPeriodId: this.selectedSemesterId(),
        presetCourseId: courseId,
        presetBlockId: blockId ?? null
      }
    });

    dialogRef.afterClosed().subscribe((result) => this.handleDialogResult(result));
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
      panelClass: 'schedule-dialog-panel',
      backdropClass: 'schedule-dialog-backdrop',
      data: {
        mode: 'entry-edit',
        catalog,
        schedule: entry
      }
    });

    dialogRef.afterClosed().subscribe((result) => this.handleDialogResult(result, entry));
  }

  openAddBreakDialog(): void {
    this.openAddRowDialog('RECREO');
  }

  openPreview(): void {
    if (!this.selectedCourse() || this.boardRows().length === 0) {
      this.snackBar.open('Selecciona un curso con horario para ver la vista previa', 'Cerrar', { duration: 2600 });
      return;
    }
    this.isPreviewOpen.set(true);
  }

  closePreview(): void {
    this.isPreviewOpen.set(false);
  }

  openAddClassDialog(): void {
    this.openAddRowDialog('CLASE');
  }

  openAddRowDialog(blockType: ScheduleBlockType): void {
    const courseId = this.selectedCourseId();
    const catalog = this.catalog();
    if (!courseId || !catalog) {
      return;
    }

    const rows = this.boardRows();
    const anchorOrder = rows[rows.length - 1]?.order ?? 0;
    const previousRow = rows[rows.length - 1] ?? null;
    const draft: ScheduleRowDraft = {
      rowKey: `custom-${anchorOrder + 1}`,
      order: anchorOrder + 1,
      startTime: previousRow?.endTime ?? '10:00',
      endTime: this.addMinutes(previousRow?.endTime ?? '10:00', blockType === 'RECREO' ? 15 : 45),
      blockType,
      isCustom: true,
      sourceOrder: null
    };

    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '560px',
      maxWidth: '84vw',
      autoFocus: false,
      panelClass: 'schedule-dialog-panel',
      backdropClass: 'schedule-dialog-backdrop',
      data: {
        mode: 'row-create',
        catalog,
        row: draft
      }
    });

    dialogRef.afterClosed().subscribe((result) => this.handleDialogResult(result));
  }

  openRowDialog(row: ScheduleBoardRow): void {
    const catalog = this.catalog();
    if (!catalog) {
      return;
    }

    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '560px',
      maxWidth: '84vw',
      autoFocus: false,
      panelClass: 'schedule-dialog-panel',
      backdropClass: 'schedule-dialog-backdrop',
      data: {
        mode: 'row-edit',
        catalog,
        row: {
          rowKey: row.rowKey,
          order: row.order,
          startTime: row.startTime,
          endTime: row.endTime,
          blockType: row.blockType,
          isCustom: row.isCustom,
          sourceOrder: row.sourceOrder
        }
      }
    });

    dialogRef.afterClosed().subscribe((result) => this.handleDialogResult(result));
  }

  async downloadSchedulePdf(): Promise<void> {
    const course = this.selectedCourse();
    const exportTarget = this.pdfScheduleRef?.nativeElement;
    if (!course || !exportTarget || this.boardRows().length === 0) {
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
      pdf.save(this.buildPdfFileName(course.name));
      this.snackBar.open('Horario escolar exportado en PDF', 'Cerrar', { duration: 2600 });
    } catch {
      this.snackBar.open('No fue posible generar el PDF del horario', 'Cerrar', { duration: 3200 });
    } finally {
      this.isExportingPdf.set(false);
    }
  }

  exportScheduleJson(): void {
    const course = this.selectedCourse();
    const period = this.periodOptions().find((item) => item.id === this.selectedSemesterId()) ?? null;
    const rows = this.boardRows();
    if (!course || !period || rows.length === 0) {
      this.snackBar.open('El horario todavia no esta listo para exportar', 'Cerrar', { duration: 2600 });
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      course,
      period,
      rows: rows.map((row) => ({
        order: row.order,
        startTime: row.startTime,
        endTime: row.endTime,
        blockType: row.blockType,
        days: this.days.map((day) => {
          const entry = this.entryFor(day, row);
          return {
            day,
            entry: entry
              ? {
                  id: entry.id,
                  subjectId: entry.subjectId,
                  subjectName: entry.subjectName,
                  teacherId: entry.teacherId,
                  teacherFullName: entry.teacherFullName,
                  room: entry.room
                }
              : null
          };
        })
      }))
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = this.buildJsonFileName(course.name);
    link.click();
    URL.revokeObjectURL(objectUrl);
    this.snackBar.open('Horario escolar exportado en JSON', 'Cerrar', { duration: 2400 });
  }

  blockFor(day: DayKey, row: ScheduleBoardRow): ScheduleBlock | undefined {
    if (row.sourceOrder === null) {
      return undefined;
    }
    return this.catalog()?.blocks.find((block) => block.dayOfWeek === day && block.order === row.sourceOrder);
  }

  entryFor(day: DayKey, row: ScheduleBoardRow): ScheduleEntry | undefined {
    const block = this.blockFor(day, row);
    return block ? this.scheduleEntries().find((entry) => entry.blockId === block.id) : undefined;
  }

  slotStyles(entry: ScheduleEntry): Record<string, string> {
    return {
      '--slot-accent': entry.subjectColorHex,
      '--slot-background': this.toRgba(entry.subjectColorHex, 0.18),
      '--slot-border': this.toRgba(entry.subjectColorHex, 0.34)
    };
  }

  trackRow(_: number, row: ScheduleBoardRow): string {
    return row.rowKey;
  }

  private handleDialogResult(result?: ScheduleDialogCloseResult, entry?: ScheduleEntry): void {
    if (!result) {
      return;
    }

    if (result.deleteEntry && entry) {
      const ref = this.snackBar.open(`Eliminar ${entry.subjectName} de ${entry.dayOfWeek}?`, 'Confirmar', {
        duration: 5000
      });
      ref.onAction().subscribe(() => {
        this.scheduleApiService.delete(entry.id).subscribe({
          next: () => {
            this.snackBar.open('Horario eliminado correctamente', 'Cerrar', { duration: 2500 });
            this.reloadSelectedCourse();
          },
          error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible eliminar el horario')
        });
      });
      return;
    }

    if (result.entryPayload) {
      if (entry) {
        this.scheduleApiService.update(entry.id, result.entryPayload).subscribe({
          next: () => {
            this.snackBar.open('Horario actualizado correctamente', 'Cerrar', { duration: 2500 });
            this.reloadSelectedCourse();
          },
          error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible actualizar el horario')
        });
        return;
      }

      this.scheduleApiService.create(result.entryPayload).subscribe({
        next: () => {
          this.snackBar.open('Horario creado correctamente', 'Cerrar', { duration: 2500 });
          this.reloadSelectedCourse();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible crear el horario')
      });
      return;
    }

    if (result.deleteRow && entry === undefined) {
      const row = result.rowPayload;
      if (!row) {
        return;
      }
      const courseId = this.selectedCourseId();
      if (!courseId) {
        return;
      }
      this.scheduleApiService.deleteRow(row.order, courseId).subscribe({
        next: () => {
          this.snackBar.open('Bloque eliminado del horario institucional', 'Cerrar', { duration: 2500 });
          this.reloadCatalogAndCourse();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible eliminar el bloque')
      });
      return;
    }

    if (result.rowPayload) {
      if (result.rowPayload.isCustom) {
        this.scheduleApiService.createRow({
          courseId: this.selectedCourseId()!,
          blockType: result.rowPayload.blockType,
          startTime: result.rowPayload.startTime,
          endTime: result.rowPayload.endTime
        }).subscribe({
          next: () => {
            this.snackBar.open(
              result.rowPayload?.blockType === 'RECREO'
                ? 'Recreo agregado al horario institucional'
                : 'Bloque horario agregado correctamente',
              'Cerrar',
              { duration: 2500 }
            );
            this.reloadCatalogAndCourse();
          },
          error: (error: HttpErrorResponse) =>
            this.showError(
              error,
              result.rowPayload?.blockType === 'RECREO'
                ? 'No fue posible agregar el recreo'
                : 'No fue posible agregar el bloque horario'
            )
        });
        return;
      }

      this.scheduleApiService.updateRowTime(result.rowPayload.order, {
        courseId: this.selectedCourseId()!,
        startTime: result.rowPayload.startTime,
        endTime: result.rowPayload.endTime
      }).subscribe({
        next: () => {
          this.snackBar.open('Hora del bloque actualizada', 'Cerrar', { duration: 2500 });
          this.reloadCatalogAndCourse();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible actualizar la hora del bloque')
      });
    }
  }

  private loadCatalog(): void {
    this.scheduleApiService.getCatalog().subscribe({
        next: (catalog) => {
          this.selectedSemesterId.set(this.resolvePreferredSemesterId(catalog));
          const preferredCourseId = this.resolvePreferredCourseId(catalog);
          this.selectedCourseId.set(preferredCourseId);
          if (preferredCourseId) {
            this.loadScopedCatalog(preferredCourseId, catalog);
          }
        },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar el catalogo horario')
    });
  }

  private loadSchedule(courseId: number, periodId: number): void {
    this.scheduleApiService.getByCourse(courseId, periodId).subscribe({
      next: (entries) => this.scheduleEntries.set(entries),
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar el horario')
    });
  }

  private reloadSelectedCourse(): void {
    const courseId = this.selectedCourseId();
    const periodId = this.selectedSemesterId();
    if (courseId && periodId) {
      this.loadSchedule(courseId, periodId);
    }
  }

  private durationForOrder(order: number): number {
    const row = this.boardRows().find((item) => item.sourceOrder === order || item.order === order);
    if (!row) {
      return 0;
    }
    return this.timeToMinutes(row.endTime) - this.timeToMinutes(row.startTime);
  }

  private formatMinutes(totalMinutes: number): string {
    if (totalMinutes <= 0) {
      return '0h';
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  private addMinutes(timeValue: string, minutesToAdd: number): string {
    const minutes = this.timeToMinutes(timeValue) + minutesToAdd;
    const normalized = Math.max(minutes, 0);
    const hours = Math.floor(normalized / 60)
      .toString()
      .padStart(2, '0');
    const minutesPart = (normalized % 60).toString().padStart(2, '0');
    return `${hours}:${minutesPart}`;
  }

  private timeToMinutes(timeValue: string): number {
    const [hours, minutes] = timeValue.split(':').map((part) => Number.parseInt(part, 10));
    return (hours || 0) * 60 + (minutes || 0);
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

  private buildPdfFileName(courseName: string): string {
    const safeCourse = courseName
      .toLowerCase()
      .replaceAll(' ', '-')
      .replaceAll('/', '-')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return `horario-escolar-${safeCourse}-${this.selectedSemesterId() ?? 'periodo'}.pdf`;
  }

  private buildJsonFileName(courseName: string): string {
    const safeCourse = courseName
      .toLowerCase()
      .replaceAll(' ', '-')
      .replaceAll('/', '-')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return `horario-escolar-${safeCourse}-${this.selectedSemesterId() ?? 'periodo'}.json`;
  }

  private reloadCatalogAndCourse(): void {
    const currentCourseId = this.selectedCourseId();
    this.scheduleApiService.getCatalog(currentCourseId).subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        if (!catalog.periods.some((period) => period.id === this.selectedSemesterId())) {
          this.selectedSemesterId.set(this.resolvePreferredSemesterId(catalog));
        }
        const nextCourseId =
          currentCourseId && catalog.courses.some((course) => course.id === currentCourseId)
            ? currentCourseId
            : this.resolvePreferredCourseId(catalog);

        this.selectedCourseId.set(nextCourseId);
        if (nextCourseId && this.selectedSemesterId()) {
          this.loadSchedule(nextCourseId, this.selectedSemesterId()!);
        }
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible refrescar el catalogo horario')
    });
  }

  private resolvePreferredCourseId(catalog: ScheduleCatalog): number | null {
    const currentCourseId = this.selectedCourseId();
    if (currentCourseId && catalog.courses.some((course) => course.id === currentCourseId)) {
      return currentCourseId;
    }

    const orderedCourses = [...catalog.courses].sort(
      (left, right) => this.courseSortWeight(left.name) - this.courseSortWeight(right.name)
    );

    return orderedCourses[0]?.id ?? null;
  }

  private loadScopedCatalog(courseId: number, baseCatalog?: ScheduleCatalog): void {
    this.scheduleApiService.getCatalog(courseId).subscribe({
      next: (catalog) => {
        const scopedCatalog: ScheduleCatalog = {
          ...catalog,
          courses: baseCatalog?.courses ?? catalog.courses,
          periods: baseCatalog?.periods ?? catalog.periods,
          teachers: baseCatalog?.teachers ?? catalog.teachers,
          subjects: baseCatalog?.subjects ?? catalog.subjects
        };
        this.catalog.set(scopedCatalog);
        const periodId = this.selectedSemesterId();
        if (periodId) {
          this.loadSchedule(courseId, periodId);
        }
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar la malla horaria del curso')
    });
  }

  private resolvePreferredSemesterId(catalog: ScheduleCatalog): number | null {
    const currentSemesterId = this.selectedSemesterId();
    if (currentSemesterId && catalog.periods.some((period) => period.id === currentSemesterId)) {
      return currentSemesterId;
    }

    const firstSemester = catalog.periods.find((period) => period.semester === 1);
    return firstSemester?.id ?? catalog.periods[0]?.id ?? null;
  }

  private isBasicCourse(name: string): boolean {
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (normalized.includes('PK') || normalized.includes('PRE KINDER') || normalized.includes('PREKINDER')) {
      return false;
    }

    if (normalized.includes('KINDER')) {
      return false;
    }

    return normalized.includes('BASICO');
  }

  private isMorningSchedule(scheduleType: string): boolean {
    const normalized = scheduleType
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    return normalized.includes('MANANA') || normalized.includes('MORNING');
  }

  private courseSortWeight(name: string): number {
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (normalized.includes('PK') || normalized.includes('PRE KINDER') || normalized.includes('PREKINDER')) {
      return 0;
    }

    if (normalized.includes('KINDER')) {
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
