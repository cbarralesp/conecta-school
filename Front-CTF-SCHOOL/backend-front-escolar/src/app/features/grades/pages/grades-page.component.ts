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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { GradeApiService } from '../../../core/services/grade-api.service';
import {
  GradeEvaluationHeader,
  GradeBookStudentRow,
  GradeBookSummary,
  GradeBookView,
  GradeCatalog,
  GradeEvaluationPayload,
  GradeReportView,
  GradeSaveEntryPayload,
  StudentGradeCard,
  StudentGradeProfileView
} from '../../../core/models/grade.models';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type GradesTab = 'book' | 'profile' | 'reports';
type EvaluationDialogState = {
  mode: 'create' | 'edit';
  evaluationId: number | null;
  code: string;
  name: string;
  weight: number | null;
  evaluationDate: string;
};

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
    MatSnackBarModule,
    TeacherModernLayoutComponent
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

  readonly user = this.authStateService.user;
  readonly activeTab = signal<GradesTab>('book');
  readonly gradeBookSearch = signal('');
  readonly evaluationDialog = signal<EvaluationDialogState | null>(null);
  readonly evaluationDetailsDialog = signal<GradeEvaluationHeader | null>(null);
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
  readonly filteredGradeBookStudents = computed(() => {
    const students = this.gradeBook()?.students ?? [];
    const term = this.gradeBookSearch().trim().toLowerCase();
    if (!term) {
      return students;
    }

    return students.filter((student) =>
      student.fullName.toLowerCase().includes(term) || student.run.toLowerCase().includes(term)
    );
  });
  readonly persistedEvaluationsCount = computed(() => this.gradeBook()?.evaluations.length ?? 0);
  readonly selectedEvaluationStats = computed(() => {
    const evaluation = this.evaluationDetailsDialog();
    const gradeBook = this.gradeBook();
    if (!evaluation || !gradeBook) {
      return null;
    }

    const scores = gradeBook.students
      .map((student) => student.scores.find((score) => score.evaluationId === evaluation.id)?.score ?? null)
      .filter((score): score is number => score != null);

    const average = scores.length === 0
      ? null
      : Math.round((scores.reduce((total, score) => total + score, 0) / scores.length) * 10) / 10;

    return {
      average,
      gradedCount: scores.length,
      pendingCount: gradeBook.students.length - scores.length
    };
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
    this.selectedSubjectId.set(null);
    this.gradeBookSearch.set('');
    this.closeDraftEvaluationDialog();
    this.closeEvaluationDetails();
    this.loadActiveView();
  }

  updatePeriod(periodId: number | null): void {
    this.selectedPeriodId.set(periodId);
    this.selectedSubjectId.set(null);
    this.gradeBookSearch.set('');
    this.closeDraftEvaluationDialog();
    this.closeEvaluationDetails();
    this.loadActiveView();
  }

  selectSubject(subjectId: number): void {
    this.selectedSubjectId.set(subjectId);
    this.closeEvaluationDetails();
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

  updateGradeBookSearch(value: string): void {
    this.gradeBookSearch.set(value);
  }

  openDraftEvaluationDialog(): void {
    const nextNumber = this.persistedEvaluationsCount() + 1;
    this.evaluationDialog.set({
      mode: 'create',
      evaluationId: null,
      code: `EVAL. ${nextNumber}`,
      name: `Evaluación ${nextNumber}`,
      weight: null,
      evaluationDate: this.todayIso()
    });
  }

  updateDraftEvaluationCode(value: string): void {
    this.evaluationDialog.update((current) => current ? { ...current, code: value } : current);
  }

  updateDraftEvaluationName(value: string): void {
    this.evaluationDialog.update((current) => current ? { ...current, name: value } : current);
  }

  updateEvaluationWeight(value: string): void {
    this.evaluationDialog.update((current) => {
      if (!current) {
        return current;
      }

      const trimmed = value.trim();
      return {
        ...current,
        weight: trimmed === '' ? null : Number.parseFloat(trimmed.replace(',', '.'))
      };
    });
  }

  updateEvaluationDate(value: string): void {
    this.evaluationDialog.update((current) => current ? { ...current, evaluationDate: value } : current);
  }

  closeDraftEvaluationDialog(): void {
    this.evaluationDialog.set(null);
  }

  openEvaluationDetails(evaluationId: number): void {
    const evaluation = this.gradeBook()?.evaluations.find((item) => item.id === evaluationId) ?? null;
    this.evaluationDetailsDialog.set(evaluation);
  }

  closeEvaluationDetails(): void {
    this.evaluationDetailsDialog.set(null);
  }

  editEvaluationFromDetails(): void {
    const evaluation = this.evaluationDetailsDialog();
    if (!evaluation) {
      return;
    }

    this.closeEvaluationDetails();
    this.openEvaluationEditor(evaluation.id);
  }

  openEvaluationEditor(evaluationId: number): void {
    const evaluation = this.gradeBook()?.evaluations.find((item) => item.id === evaluationId);
    if (!evaluation) {
      return;
    }

    this.evaluationDialog.set({
      mode: 'edit',
      evaluationId,
      code: evaluation.code,
      name: evaluation.name,
      weight: evaluation.weight ?? null,
      evaluationDate: evaluation.evaluationDate ?? ''
    });
  }

  private buildEvaluationPayload(dialog: EvaluationDialogState): GradeEvaluationPayload | null {
    const courseId = this.selectedCourseId();
    const periodId = this.selectedPeriodId();
    const subjectId = this.selectedSubjectId();
    const code = dialog.code.trim();
    const name = dialog.name.trim();
    const weight = dialog.weight == null || Number.isNaN(dialog.weight)
      ? null
      : Math.max(0, Math.round(dialog.weight * 100) / 100);
    const evaluationDate = dialog.evaluationDate.trim();

    if (!courseId || !periodId || !subjectId) {
      this.snackBar.open('Selecciona curso, periodo y asignatura antes de gestionar evaluaciones', 'Cerrar', {
        duration: 2800
      });
      return null;
    }

    if (!code || !name || weight == null || !evaluationDate) {
      this.snackBar.open('Completa codigo, nombre, ponderacion y fecha de la evaluacion', 'Cerrar', {
        duration: 2800
      });
      return null;
    }

    return {
      courseId,
      periodId,
      subjectId,
      code,
      name,
      weight,
      evaluationDate
    };
  }

  private handleEvaluationViewUpdate(view: GradeBookView, message: string): void {
    this.gradeBook.set(view);
    this.selectedSubjectId.set(view.subjectId);
    this.closeDraftEvaluationDialog();
    this.closeEvaluationDetails();
    this.snackBar.open(message, 'Cerrar', { duration: 2600 });
    this.loadStudentProfile();
    this.loadReports();
  }

  addDraftEvaluation(): void {
    const draft = this.evaluationDialog();
    if (!draft || this.isSaving()) {
      return;
    }
    const payload = this.buildEvaluationPayload(draft);
    if (!payload) {
      return;
    }
    this.isSaving.set(true);
    this.gradeApiService.createEvaluation(payload).subscribe({
      next: (view) => {
        this.isSaving.set(false);
        this.handleEvaluationViewUpdate(view, 'Evaluacion creada correctamente');
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(error, 'No fue posible crear la evaluacion');
      }
    });
  }

  saveEvaluationDialog(): void {
    const dialog = this.evaluationDialog();
    if (!dialog) {
      return;
    }
    if (dialog.mode === 'create') {
      this.addDraftEvaluation();
      return;
    }
    if (dialog.evaluationId == null || this.isSaving()) {
      return;
    }
    const payload = this.buildEvaluationPayload(dialog);
    if (!payload) {
      return;
    }
    this.isSaving.set(true);
    this.gradeApiService.updateEvaluation(dialog.evaluationId, payload).subscribe({
      next: (view) => {
        this.isSaving.set(false);
        this.handleEvaluationViewUpdate(view, 'Evaluacion actualizada correctamente');
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(error, 'No fue posible actualizar la evaluacion');
      }
    });
  }

  removeEvaluation(evaluationId: number): void {
    const courseId = this.selectedCourseId();
    const periodId = this.selectedPeriodId();
    const subjectId = this.selectedSubjectId();
    if (!courseId || !periodId || !subjectId || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.gradeApiService.deleteEvaluation(evaluationId, courseId, periodId, subjectId).subscribe({
      next: (view) => {
        this.isSaving.set(false);
        this.handleEvaluationViewUpdate(view, 'Evaluacion eliminada correctamente');
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(error, 'No fue posible eliminar la evaluacion');
      }
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
      student.scores
        .map((scoreCell) => ({
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
        this.snackBar.open('Notas guardadas correctamente', 'Cerrar', { duration: 3200 });
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
    this.snackBar.open('Evaluaciones exportadas', 'Cerrar', { duration: 2400 });
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

  formatEvaluationDate(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    const [year, month, day] = value.split('-');
    if (!year || !month || !day) {
      return value;
    }

    return `${day}-${month}-${year}`;
  }

  formatWeight(value: number | null | undefined): string {
    if (value == null) {
      return 'Sin ponderación';
    }

    return `${value.toFixed(0)}%`;
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
        this.showError(error, 'No fue posible cargar el catalogo de evaluaciones');
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
        this.gradeBookSearch.set('');
        this.closeDraftEvaluationDialog();
        this.closeEvaluationDetails();
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar las evaluaciones');
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


  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }


  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3600
    });
  }
}

