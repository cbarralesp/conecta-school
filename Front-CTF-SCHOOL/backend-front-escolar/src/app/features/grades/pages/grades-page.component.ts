import { HttpErrorResponse } from '@angular/common/http';
import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { GradeApiService } from '../../../core/services/grade-api.service';
import {
  GradeBookStudentRow,
  GradeBookSummary,
  GradeBookView,
  GradeCatalog,
  GradeReportView,
  GradeSaveEntryPayload,
  StudentGradeCard,
  StudentGradeProfileView
} from '../../../core/models/grade.models';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';

type GradesTab = 'book' | 'profile' | 'reports';

@Component({
  selector: 'app-grades-page',
  imports: [
    NgClass,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatToolbarModule,
    TeacherSideMenuComponent
  ],
  templateUrl: './grades-page.component.html',
  styleUrl: './grades-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GradesPageComponent {
  @ViewChild('reportPdfTemplate') private reportPdfTemplate?: ElementRef<HTMLElement>;

  private readonly gradeApiService = inject(GradeApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly activeTab = signal<GradesTab>('book');
  readonly catalog = signal<GradeCatalog | null>(null);
  readonly selectedCourseId = signal<number | null>(null);
  readonly selectedPeriodId = signal<number | null>(null);
  readonly selectedSubjectId = signal<number | null>(null);
  readonly selectedProfileStudentId = signal<number | null>(null);
  readonly profileRunSearchTerm = signal('');
  readonly gradeBook = signal<GradeBookView | null>(null);
  readonly studentProfile = signal<StudentGradeProfileView | null>(null);
  readonly reports = signal<GradeReportView | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);
  readonly pdfStudent = signal<StudentGradeCard | null>(null);

  readonly courses = computed(() => this.catalog()?.courses ?? []);
  readonly periods = computed(() => this.catalog()?.periods ?? []);
  readonly selectedCourse = computed(() => this.courses().find((course) => course.id === this.selectedCourseId()) ?? null);
  readonly selectedPeriod = computed(() => this.periods().find((period) => period.id === this.selectedPeriodId()) ?? null);
  readonly subjectTabs = computed(() => this.gradeBook()?.subjects ?? []);
  readonly gradeBookSummary = computed<GradeBookSummary | null>(() => this.gradeBook()?.summary ?? null);
  readonly profileSummary = computed(() => this.buildProfileSummary(this.studentProfile()?.students ?? []));
  readonly reportSummary = computed(() => this.buildProfileSummary(this.reports()?.students ?? []));
  readonly filteredProfileStudents = computed(() => {
    const students = this.studentProfile()?.students ?? [];
    const selectedStudentId = this.selectedProfileStudentId();
    const runSearch = this.profileRunSearchTerm().trim().toLowerCase();

    return students.filter((student) => {
      const matchesStudent = selectedStudentId == null || student.studentId === selectedStudentId;
      const matchesRun = runSearch.length === 0 || student.run.toLowerCase().includes(runSearch);
      return matchesStudent && matchesRun;
    });
  });
  readonly profileStudentOptions = computed(() => this.studentProfile()?.students ?? []);
  readonly displayedReports = computed(() => {
    const students = this.reports()?.students ?? [];
    const selectedStudentId = this.selectedProfileStudentId();
    const runSearch = this.profileRunSearchTerm().trim().toLowerCase();

    const filtered = students.filter((student) => {
      const matchesStudent = selectedStudentId ? student.studentId === selectedStudentId : true;
      const matchesRun = runSearch ? student.run.toLowerCase().includes(runSearch) : true;
      return matchesStudent && matchesRun;
    });

    return filtered.slice(0, 1);
  });

  constructor() {
    this.loadCatalog();
  }

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }

  setTab(tab: GradesTab): void {
    this.activeTab.set(tab);
    this.loadActiveView();
  }

  updateCourse(courseId: number | null): void {
    this.selectedCourseId.set(courseId);
    this.loadActiveView();
  }

  updatePeriod(periodId: number | null): void {
    this.selectedPeriodId.set(periodId);
    this.loadActiveView();
  }

  selectSubject(subjectId: number): void {
    this.selectedSubjectId.set(subjectId);
    this.loadGradeBook();
  }

  updateScore(studentId: number, evaluationId: number, rawValue: string): void {
    const parsed = rawValue.trim() === '' ? null : Number.parseFloat(rawValue.replace(',', '.'));
    const score = parsed == null || Number.isNaN(parsed) ? null : this.clampScore(parsed);

    this.gradeBook.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) =>
        student.studentId !== studentId
          ? student
          : {
              ...student,
              scores: student.scores.map((cell) => (cell.evaluationId === evaluationId ? { ...cell, score } : cell))
            }
      );

      const recalculated = students.map((student) => this.rebuildStudentRow(student));
      return { ...current, students: recalculated, summary: this.calculateSummary(recalculated) };
    });
  }

  saveGradeBook(): void {
    const gradeBook = this.gradeBook();
    const courseId = this.selectedCourseId();
    const periodId = this.selectedPeriodId();
    const subjectId = this.selectedSubjectId();
    if (!gradeBook || !courseId || !periodId || !subjectId || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    const entries: GradeSaveEntryPayload[] = gradeBook.students.flatMap((student) =>
      student.scores.map((scoreCell) => ({
        studentId: student.studentId,
        evaluationId: scoreCell.evaluationId,
        score: scoreCell.score
      }))
    );

    this.gradeApiService.saveGradeBook({ courseId, periodId, subjectId, entries }).subscribe({
      next: (view) => {
        this.gradeBook.set(view);
        this.selectedSubjectId.set(view.subjectId);
        this.isSaving.set(false);
        this.snackBar.open('Notas guardadas correctamente', 'Cerrar', { duration: 2600 });
        this.loadStudentProfile();
        this.loadReports();
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(error, 'No fue posible guardar las notas');
      }
    });
  }

  exportGradeBook(): void {
    const gradeBook = this.gradeBook();
    if (!gradeBook) {
      return;
    }

    const headers = ['Estudiante', ...gradeBook.evaluations.map((evaluation) => evaluation.code), 'Promedio', 'Estado'];
    const rows = gradeBook.students.map((student) => [
      student.fullName,
      ...student.scores.map((score) => this.exportScore(score.score)),
      this.exportScore(student.average),
      student.status
    ]);
    const content = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');

    this.downloadBlob(
      new Blob([content], { type: 'text/csv;charset=utf-8;' }),
      `libro-notas-${this.slug(this.selectedCourse()?.name ?? 'curso')}-${this.slug(this.selectedPeriod()?.name ?? 'periodo')}.csv`
    );
    this.snackBar.open('Libro de notas exportado', 'Cerrar', { duration: 2400 });
  }

  async exportStudentPdf(student: StudentGradeCard): Promise<void> {
    await this.exportReportsPdf([student], `informe-${this.slug(student.fullName)}.pdf`);
  }

  async exportMassivePdf(): Promise<void> {
    const students = this.reports()?.students ?? [];
    if (students.length === 0) {
      this.snackBar.open('No hay informes disponibles para exportar', 'Cerrar', { duration: 2600 });
      return;
    }
    await this.exportReportsPdf(
      students,
      `informes-notas-${this.slug(this.selectedCourse()?.name ?? 'curso')}-${this.slug(this.selectedPeriod()?.name ?? 'periodo')}.pdf`
    );
  }

  updateProfileStudent(studentId: number | null): void {
    this.selectedProfileStudentId.set(studentId);
  }

  updateProfileRunSearch(value: string): void {
    this.profileRunSearchTerm.set(value);
  }

  badgeClass(status: string): string {
    switch (status) {
      case 'Destacado': return 'is-success';
      case 'Aprobado': return 'is-warning';
      case 'Riesgo': return 'is-danger';
      default: return 'is-neutral';
    }
  }

  scoreToneClass(value: number | null | undefined): string {
    if (value == null) {
      return 'is-empty';
    }

    if (value >= 5.5) {
      return 'is-high';
    }

    if (value >= 4) {
      return 'is-mid';
    }

    return 'is-low';
  }

  initials(fullName: string): string {
    return fullName.split(' ').filter(Boolean).slice(0, 2).map((value) => value[0]).join('').toUpperCase();
  }

  formatScore(value: number | null | undefined): string {
    return value == null ? '—' : value.toFixed(1);
  }

  trackStudent(index: number, student: { studentId: number }): number {
    return student.studentId;
  }

  private loadCatalog(): void {
    this.isLoading.set(true);
    this.gradeApiService.getCatalog().subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        this.selectedCourseId.set(catalog.courses[0]?.id ?? null);
        this.selectedPeriodId.set(catalog.periods[0]?.id ?? null);
        this.isLoading.set(false);
        this.loadActiveView();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el catalogo de calificaciones');
      }
    });
  }

  private loadActiveView(): void {
    if (!this.selectedCourseId() || !this.selectedPeriodId()) {
      return;
    }

    switch (this.activeTab()) {
      case 'book': this.loadGradeBook(); break;
      case 'profile': this.loadStudentProfile(); break;
      case 'reports': this.loadReports(); break;
    }
  }

  private loadGradeBook(): void {
    const courseId = this.selectedCourseId();
    const periodId = this.selectedPeriodId();
    if (!courseId || !periodId) {
      return;
    }

    this.isLoading.set(true);
    this.gradeApiService.getGradeBook(courseId, periodId, this.selectedSubjectId()).subscribe({
      next: (view) => {
        this.gradeBook.set(view);
        this.selectedSubjectId.set(view.subjectId);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el libro de notas');
      }
    });
  }

  private loadStudentProfile(): void {
    const courseId = this.selectedCourseId();
    const periodId = this.selectedPeriodId();
    if (!courseId || !periodId) {
      return;
    }

    this.isLoading.set(true);
    this.gradeApiService.getStudentProfile(courseId, periodId).subscribe({
      next: (view) => {
        this.studentProfile.set(view);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
      this.showError(error, 'No fue posible cargar la ficha por estudiante');
      }
    });
  }

  private loadReports(): void {
    const courseId = this.selectedCourseId();
    const periodId = this.selectedPeriodId();
    if (!courseId || !periodId) {
      return;
    }

    this.isLoading.set(true);
    this.gradeApiService.getReports(courseId, periodId).subscribe({
      next: (view) => {
        this.reports.set(view);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar los informes de notas');
      }
    });
  }

  private rebuildStudentRow(student: GradeBookStudentRow): GradeBookStudentRow {
    const validScores = student.scores.map((cell) => cell.score).filter((score): score is number => score != null);
    const average = validScores.length === 0
      ? null
      : Math.round((validScores.reduce((total, score) => total + score, 0) / validScores.length) * 10) / 10;

    return { ...student, average, status: this.resolveStatus(average) };
  }

  private calculateSummary(students: GradeBookStudentRow[]): GradeBookSummary {
    const averages = students.map((student) => student.average).filter((average): average is number => average != null);
    const courseAverage = averages.length === 0
      ? null
      : Math.round((averages.reduce((total, average) => total + average, 0) / averages.length) * 10) / 10;

    return {
      courseAverage,
      aboveMinimumCount: averages.filter((average) => average >= 4).length,
      belowMinimumCount: averages.filter((average) => average < 4).length,
      ungradedCount: students.filter((student) => student.average == null).length
    };
  }

  private resolveStatus(average: number | null): string {
    if (average == null) return 'Sin notas';
    if (average >= 6) return 'Destacado';
    if (average >= 4) return 'Aprobado';
    return 'Riesgo';
  }

  private buildProfileSummary(students: StudentGradeCard[]) {
    const averages = students.map((student) => student.overallAverage).filter((average): average is number => average != null);
    return {
      overallAverage: averages.length === 0 ? null : Math.round((averages.reduce((total, value) => total + value, 0) / averages.length) * 10) / 10,
      outstanding: students.filter((student) => student.status === 'Destacado').length,
      atRisk: students.filter((student) => student.status === 'Riesgo').length,
      ungraded: students.filter((student) => student.overallAverage == null).length
    };
  }

  private async exportReportsPdf(students: StudentGradeCard[], fileName: string): Promise<void> {
    const template = this.reportPdfTemplate?.nativeElement;
    if (!template || this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let firstPage = true;

      for (const student of students) {
        this.pdfStudent.set(student);
        await this.waitForRender();

        const canvas = await html2canvas(template, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 8;
        const printableWidth = pageWidth - margin * 2;
        const printableHeight = pageHeight - margin * 2;
        const scale = Math.min(printableWidth / canvas.width, printableHeight / canvas.height);
        const width = canvas.width * scale;
        const height = canvas.height * scale;
        const x = (pageWidth - width) / 2;
        const y = margin;

        if (!firstPage) {
          pdf.addPage();
        }
        firstPage = false;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, width, height, undefined, 'FAST');
      }

      pdf.save(fileName);
      this.snackBar.open('Informe de notas generado correctamente', 'Cerrar', { duration: 2600 });
    } catch {
      this.snackBar.open('No fue posible exportar el informe de notas', 'Cerrar', { duration: 3200 });
    } finally {
      this.pdfStudent.set(null);
      this.isExporting.set(false);
    }
  }

  private waitForRender(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private exportScore(value: number | null): string {
    return value == null ? '' : value.toFixed(1);
  }

  private clampScore(value: number): number {
    return Math.min(7, Math.max(1, Math.round(value * 10) / 10));
  }

  private slug(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3600
    });
  }
}
