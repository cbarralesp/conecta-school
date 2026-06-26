import { HttpErrorResponse } from '@angular/common/http';
import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { catchError, firstValueFrom, forkJoin, map, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { normalizeDashboardText } from '../../../core/utils/text-normalizer';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import { GradeApiService } from '../../../core/services/grade-api.service';
import {
  PedagogicalAnswer,
  PedagogicalQuestionBankArea,
  GradeEvaluationHeader,
  GradeBookStudentRow,
  GradeBookSummary,
  GradeBookView,
  GradeCatalog,
  GradeEvaluationPayload,
  PedagogicalReportArea,
  PedagogicalReportView,
  GradeRegistrationType,
  GradeReportView,
  GradeSaveEntryPayload,
  SavePedagogicalReportPayload,
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
  registrationType: GradeRegistrationType;
};

type EvaluationKind = 'DIAGNOSTICA' | 'PROCESO' | 'SUMATIVA';
type PedagogicalAreaEditorState = {
  areaKey: string;
  areaTitle: string;
  isAttitude: boolean;
  selectedQuestionIds: number[];
  questions: Array<{ id: number; label: string; sortOrder: number }>;
};

type ReportSubjectDetail = {
  evaluationType: 'NUMERICA' | 'CONCEPTUAL';
  scores: Array<number | null>;
  concepts: Array<string | null>;
  percentages: Array<number | null>;
  registrationTypes: GradeRegistrationType[];
  average: number | null;
  conceptSummaryCode: string | null;
  evaluations: Array<{ label: string; score: number | null; conceptCode: string | null; percentage: number | null; registrationType: GradeRegistrationType }>;
};

const DEFAULT_EVALUATION_WEIGHT = 20;
const CONCEPT_OPTIONS = [
  { code: 'L', label: 'Logrado' },
  { code: 'ML', label: 'Medianamente logrado' },
  { code: 'PL', label: 'Por lograr' },
  { code: 'NL', label: 'No logrado' },
  { code: 'I', label: 'Iniciado' },
  { code: 'EP', label: 'En proceso' },
  { code: 'OA', label: 'Objetivo alcanzado' }
] as const;

@Component({
  selector: 'app-grades-page',
  imports: [
    NgClass,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    FormsModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './grades-page.component.html',
  styleUrl: './grades-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GradesPageComponent {
  @ViewChild('reportPdfTemplate') private reportPdfTemplate?: ElementRef<HTMLElement>;
  @ViewChild('pedagogicalPdfTemplate') private pedagogicalPdfTemplate?: ElementRef<HTMLElement>;

  private readonly gradeApiService = inject(GradeApiService);
  private readonly attendanceApiService = inject(AttendanceApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private gradeBookRequestId = 0;
  private profileRequestId = 0;
  private reportsRequestId = 0;

  readonly user = this.authStateService.user;
  readonly activeTab = signal<GradesTab>('book');
  readonly gradeBookSearch = signal('');
  readonly evaluationDialog = signal<EvaluationDialogState | null>(null);
  readonly evaluationKindDialogOpen = signal(false);
  readonly selectedEvaluationKind = signal<EvaluationKind>('SUMATIVA');
  readonly evaluationDetailsDialog = signal<GradeEvaluationHeader | null>(null);
  readonly catalog = signal<GradeCatalog | null>(null);
  readonly selectedCourseId = signal<number | null>(null);
  readonly selectedPeriodId = signal<number | null>(null);
  readonly selectedSubjectId = signal<number | null>(null);
  readonly selectedProfileStudentId = signal<number | null>(null);
  readonly selectedProfileExpandedSubjectId = signal<number | null>(null);
  readonly selectedReportStudentId = signal<number | null>(null);
  readonly selectedReportSubjectId = signal<number | null>(null);
  readonly profileRunSearchTerm = signal('');
  readonly reportRunSearchTerm = signal('');
  readonly isReportPreviewOpen = signal(false);
  readonly isPedagogicalSheetPreviewOpen = signal(false);
  readonly isPedagogicalPreviewOpen = signal(false);
  readonly pedagogicalAreaEditor = signal<PedagogicalAreaEditorState | null>(null);
  readonly previewStudent = signal<StudentGradeCard | null>(null);
  readonly observationDraft = signal('');
  readonly pedagogicalDraft = signal<PedagogicalReportView | null>(null);
  readonly pedagogicalReports = signal<Record<number, PedagogicalReportView>>({});
  readonly pedagogicalQuestionBank = signal<PedagogicalQuestionBankArea[]>([]);
  readonly pedagogicalQuestionBankLevel = signal<'PREKINDER' | 'KINDER' | 'GENERAL' | null>(null);
  readonly gradeBook = signal<GradeBookView | null>(null);
  readonly gradeBookNotice = signal<string | null>(null);
  readonly studentProfile = signal<StudentGradeProfileView | null>(null);
  readonly reports = signal<GradeReportView | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);
  readonly pdfStudent = signal<StudentGradeCard | null>(null);
  readonly pdfPedagogicalReport = signal<PedagogicalReportView | null>(null);
  readonly reportDetailBooks = signal<GradeBookView[]>([]);
  readonly reportAttendanceRates = signal<Record<number, number | null>>({});
  readonly savedObservations = signal<Record<number, string>>({});

  readonly courses = computed(() => this.catalog()?.courses ?? []);
  readonly periods = computed(() => this.catalog()?.periods ?? []);
  readonly selectedCourse = computed(() => this.courses().find((course) => course.id === this.selectedCourseId()) ?? null);
  readonly selectedPeriod = computed(() => this.periods().find((period) => period.id === this.selectedPeriodId()) ?? null);
  readonly conceptOptions = CONCEPT_OPTIONS;
  readonly diagnosticConceptOptions = CONCEPT_OPTIONS.filter((option) => ['L', 'ML', 'PL'].includes(option.code));
  readonly currentGradeBook = computed(() => {
    const view = this.gradeBook();
    return view && view.courseId === this.selectedCourseId() && view.periodId === this.selectedPeriodId() ? view : null;
  });
  readonly isConceptualGradeBook = computed(() => this.currentGradeBook()?.subjectEvaluationType === 'CONCEPTUAL');
  readonly currentStudentProfile = computed(() => {
    const view = this.studentProfile();
    return view && view.courseId === this.selectedCourseId() && view.periodId === this.selectedPeriodId() ? view : null;
  });
  readonly currentReports = computed(() => {
    const view = this.reports();
    return view && view.courseId === this.selectedCourseId() && view.periodId === this.selectedPeriodId() ? view : null;
  });
  readonly showPedagogicalTab = computed(() => true);
  readonly subjectTabs = computed(() => this.currentGradeBook()?.subjects ?? []);
  readonly gradeBookSummary = computed<GradeBookSummary | null>(() => this.currentGradeBook()?.summary ?? null);
  readonly profileSummary = computed(() => this.buildProfileSummary(this.currentStudentProfile()?.students ?? []));
  readonly reportSummary = computed(() => this.buildProfileSummary(this.currentReports()?.students ?? []));
  readonly profileSubjectOptions = computed(() => {
    const subjects = new Map<number, { id: number; name: string; colorHex: string }>();
    for (const student of this.currentStudentProfile()?.students ?? []) {
      for (const subject of student.subjects) {
        if (!subjects.has(subject.subjectId)) {
          subjects.set(subject.subjectId, {
            id: subject.subjectId,
            name: subject.subjectName,
            colorHex: subject.colorHex
          });
        }
      }
    }

    return Array.from(subjects.values()).sort((left, right) => left.name.localeCompare(right.name));
  });
  readonly profileDisplaySummary = computed(() => {
    const students = this.currentStudentProfile()?.students ?? [];
    const selectedSubjectId = this.selectedSubjectId();
    if (selectedSubjectId == null) {
      return this.buildProfileSummary(students);
    }

    const values = students.map((student) =>
      student.subjects.find((subject) => subject.subjectId === selectedSubjectId)?.average ?? null
    );
    const averages = values.filter((value): value is number => value != null);

    return {
      overallAverage: averages.length
        ? Math.round((averages.reduce((total, value) => total + value, 0) / averages.length) * 10) / 10
        : null,
      outstanding: values.filter((value) => value != null && value >= 6).length,
      atRisk: values.filter((value) => value != null && value < 4).length,
      ungraded: values.filter((value) => value == null).length
    };
  });
  readonly profileListStudents = computed(() => {
    const students = this.currentStudentProfile()?.students ?? [];
    const term = this.profileRunSearchTerm().trim().toLowerCase();
    if (!term) {
      return students;
    }

    return students.filter((student) =>
      student.fullName.toLowerCase().includes(term) || student.run.toLowerCase().includes(term)
    );
  });
  readonly activeProfileStudent = computed(() => {
    const students = this.profileListStudents();
    const selectedStudentId = this.selectedProfileStudentId();
    if (students.length === 0) {
      return null;
    }

    return students.find((student) => student.studentId === selectedStudentId) ?? students[0];
  });
  readonly filteredProfileStudents = computed(() => {
    const students = this.currentStudentProfile()?.students ?? [];
    const selectedStudentId = this.selectedProfileStudentId();
    const runSearch = this.profileRunSearchTerm().trim().toLowerCase();

    return students.filter((student) => {
      const matchesStudent = selectedStudentId == null || student.studentId === selectedStudentId;
      const matchesRun = runSearch.length === 0 || student.run.toLowerCase().includes(runSearch);
      return matchesStudent && matchesRun;
    });
  });
  readonly profileStudentOptions = computed(() => this.currentStudentProfile()?.students ?? []);
  readonly reportListStudents = computed(() => {
    const students = this.currentReports()?.students ?? [];
    const term = this.reportRunSearchTerm().trim().toLowerCase();
    if (!term) {
      return students;
    }

    return students.filter((student) =>
      student.fullName.toLowerCase().includes(term) || student.run.toLowerCase().includes(term)
    );
  });
  readonly activeReportStudent = computed(() => {
    const students = this.reportListStudents();
    const selectedStudentId = this.selectedReportStudentId();
    if (students.length === 0) {
      return null;
    }

    return students.find((student) => student.studentId === selectedStudentId) ?? students[0];
  });
  readonly reportRankedStudents = computed(() =>
    [...(this.currentReports()?.students ?? [])].sort((left, right) => {
      if (left.overallAverage == null && right.overallAverage == null) {
        return left.fullName.localeCompare(right.fullName);
      }
      if (left.overallAverage == null) {
        return 1;
      }
      if (right.overallAverage == null) {
        return -1;
      }
      return right.overallAverage - left.overallAverage || left.fullName.localeCompare(right.fullName);
    })
  );
  readonly reportSubjectAverages = computed(() => {
    const aggregates = new Map<number, {
      subjectId: number;
      subjectName: string;
      colorHex: string;
      total: number;
      count: number;
      outstanding: number;
      atRisk: number;
    }>();

    for (const student of this.currentReports()?.students ?? []) {
      for (const subject of student.subjects) {
        const bucket = aggregates.get(subject.subjectId) ?? {
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          colorHex: subject.colorHex,
          total: 0,
          count: 0,
          outstanding: 0,
          atRisk: 0
        };

        if (subject.average != null) {
          bucket.total += subject.average;
          bucket.count += 1;
          if (subject.average >= 6) {
            bucket.outstanding += 1;
          }
          if (subject.average < 4) {
            bucket.atRisk += 1;
          }
        }

        aggregates.set(subject.subjectId, bucket);
      }
    }

    return Array.from(aggregates.values())
      .map((subject) => ({
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        colorHex: subject.colorHex,
        average: subject.count === 0 ? null : Math.round((subject.total / subject.count) * 10) / 10,
        count: subject.count,
        outstanding: subject.outstanding,
        atRisk: subject.atRisk
      }))
      .sort((left, right) => {
        if (left.average == null && right.average == null) {
          return left.subjectName.localeCompare(right.subjectName);
        }
        if (left.average == null) {
          return 1;
        }
        if (right.average == null) {
          return -1;
        }
        return right.average - left.average || left.subjectName.localeCompare(right.subjectName);
      });
  });
  readonly displayedReports = computed(() => {
    const students = this.currentReports()?.students ?? [];
    const selectedStudentId = this.selectedReportStudentId();
    const runSearch = this.reportRunSearchTerm().trim().toLowerCase();

    const filtered = students.filter((student) => {
      const matchesStudent = selectedStudentId ? student.studentId === selectedStudentId : true;
      const matchesRun = runSearch ? student.run.toLowerCase().includes(runSearch) : true;
      return matchesStudent && matchesRun;
    });

    return filtered.slice(0, 1);
  });
  readonly filteredGradeBookStudents = computed(() => {
    const students = this.currentGradeBook()?.students ?? [];
    const term = this.gradeBookSearch().trim().toLowerCase();
    if (!term) {
      return students;
    }

    return students.filter((student) =>
      student.fullName.toLowerCase().includes(term) || student.run.toLowerCase().includes(term)
    );
  });
  readonly persistedEvaluationsCount = computed(() => this.currentGradeBook()?.evaluations.length ?? 0);
  readonly selectedEvaluationStats = computed(() => {
    const evaluation = this.evaluationDetailsDialog();
    const gradeBook = this.currentGradeBook();
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
    if (tab === 'profile' || tab === 'reports') {
      this.selectedSubjectId.set(null);
    }
    this.activeTab.set(tab);
    this.clearTabState();
    this.loadActiveView();
  }

  updateCourse(courseId: number | null): void {
    this.selectedCourseId.set(courseId);
    this.selectedSubjectId.set(null);
    this.clearTabState();
    this.loadActiveView();
  }

  updatePeriod(periodId: number | null): void {
    this.selectedPeriodId.set(periodId);
    this.selectedSubjectId.set(null);
    this.clearTabState();
    this.loadActiveView();
  }

  selectSubject(subjectId: number | null): void {
    if (subjectId == null) {
      return;
    }
    this.selectedSubjectId.set(subjectId);
    this.gradeBookNotice.set(null);
    this.closeEvaluationDetails();
    this.loadGradeBook();
  }

  updateScore(studentId: number, evaluationId: number, rawValue: string): void {
    if (this.isConceptualGradeBook()) {
      return;
    }
    if (this.registrationTypeForEvaluation(evaluationId) === 'DIAGNOSTICA') {
      return;
    }
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
              scores: student.scores.map((cell) => (
                cell.evaluationId === evaluationId
                  ? { ...cell, score, conceptCode: null, percentage: null }
                  : cell
              ))
            }
      );

      const recalculated = students.map((student) => this.rebuildStudentRow(student, current.subjectEvaluationType));
      return { ...current, students: recalculated, summary: this.calculateSummary(recalculated) };
    });
  }

  normalizeScoreInput(event: Event, studentId: number, evaluationId: number): void {
    if (this.isConceptualGradeBook()) {
      return;
    }
    if (this.registrationTypeForEvaluation(evaluationId) === 'DIAGNOSTICA') {
      return;
    }
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    const parsed = input.value.trim() === '' ? null : Number.parseFloat(input.value.replace(',', '.'));
    const score = parsed == null || Number.isNaN(parsed) ? null : this.clampScore(parsed);
    input.value = score == null ? '' : score.toFixed(1);
    this.updateScore(studentId, evaluationId, input.value);
  }

  updateDiagnosticConcept(studentId: number, evaluationId: number, conceptCode: string | null): void {
    this.gradeBook.update((current) => {
      if (!current) {
        return current;
      }

      const normalizedConceptCode = conceptCode && conceptCode.trim().length > 0 ? conceptCode : null;
      const students = current.students.map((student) =>
        student.studentId !== studentId
          ? student
          : {
              ...student,
              scores: student.scores.map((cell) => (
                cell.evaluationId === evaluationId
                  ? { ...cell, score: null, percentage: null, conceptCode: normalizedConceptCode }
                  : cell
              ))
            }
      );

      const recalculated = students.map((student) => this.rebuildStudentRow(student, current.subjectEvaluationType));
      return { ...current, students: recalculated, summary: this.calculateSummary(recalculated) };
    });
  }

  updateConceptScore(studentId: number, evaluationId: number, conceptCode: string | null): void {
    this.gradeBook.update((current) => {
      if (!current) {
        return current;
      }

      const normalizedConceptCode = conceptCode && conceptCode.trim().length > 0 ? conceptCode : null;
      const students = current.students.map((student) =>
        student.studentId !== studentId
          ? student
          : {
              ...student,
              scores: student.scores.map((cell) => (
                cell.evaluationId === evaluationId
                  ? { ...cell, score: null, conceptCode: normalizedConceptCode, percentage: null }
                  : cell
              ))
            }
      );

      const recalculated = students.map((student) => this.rebuildStudentRow(student, current.subjectEvaluationType));
      return { ...current, students: recalculated, summary: this.calculateSummary(recalculated) };
    });
  }

  updateGradeBookSearch(value: string): void {
    this.gradeBookSearch.set(value);
  }

  openDraftEvaluationDialog(): void {
    this.selectedEvaluationKind.set('SUMATIVA');
    this.evaluationKindDialogOpen.set(true);
  }

  openSummativeEvaluationDialog(): void {
    const nextNumber = this.nextEvaluationNumber('SUMATIVA');
    this.evaluationDialog.set({
      mode: 'create',
      evaluationId: null,
      code: `N${nextNumber}`,
      name: `Evaluacion ${nextNumber}`,
      weight: DEFAULT_EVALUATION_WEIGHT,
      evaluationDate: this.todayIso(),
      registrationType: 'SUMATIVA'
    });
  }

  openProcessEvaluationDialog(): void {
    const nextNumber = this.nextEvaluationNumber('PROCESO');
    this.evaluationDialog.set({
      mode: 'create',
      evaluationId: null,
      code: `NC${nextNumber}`,
      name: `Nota de proceso ${nextNumber}`,
      weight: DEFAULT_EVALUATION_WEIGHT,
      evaluationDate: this.todayIso(),
      registrationType: 'PROCESO'
    });
  }

  openDiagnosticEvaluationDialog(): void {
    const nextNumber = this.nextEvaluationNumber('DIAGNOSTICA');
    this.evaluationDialog.set({
      mode: 'create',
      evaluationId: null,
      code: `DG${nextNumber}`,
      name: `Evaluacion diagnostica ${nextNumber}`,
      weight: 0,
      evaluationDate: this.todayIso(),
      registrationType: 'DIAGNOSTICA'
    });
  }

  closeEvaluationKindDialog(): void {
    this.evaluationKindDialogOpen.set(false);
  }

  chooseEvaluationKind(kind: EvaluationKind): void {
    this.selectedEvaluationKind.set(kind);
  }

  continueEvaluationKindSelection(): void {
    this.selectEvaluationKind(this.selectedEvaluationKind());
  }

  selectEvaluationKind(kind: EvaluationKind): void {
    if (kind === 'SUMATIVA') {
      this.evaluationKindDialogOpen.set(false);
      this.openSummativeEvaluationDialog();
      return;
    }

    if (kind === 'PROCESO') {
      this.evaluationKindDialogOpen.set(false);
      this.openProcessEvaluationDialog();
      return;
    }

    if (kind === 'DIAGNOSTICA') {
      this.evaluationKindDialogOpen.set(false);
      this.openDiagnosticEvaluationDialog();
      return;
    }

    this.evaluationKindDialogOpen.set(false);
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
    const evaluation = this.currentGradeBook()?.evaluations.find((item) => item.id === evaluationId) ?? null;
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
    const evaluation = this.currentGradeBook()?.evaluations.find((item) => item.id === evaluationId);
    if (!evaluation) {
      return;
    }

    this.evaluationDialog.set({
      mode: 'edit',
      evaluationId,
      code: evaluation.code,
      name: evaluation.name,
      weight: evaluation.weight ?? null,
      evaluationDate: evaluation.evaluationDate ?? '',
      registrationType: evaluation.registrationType ?? 'SUMATIVA'
    });
  }

  private buildEvaluationPayload(dialog: EvaluationDialogState): GradeEvaluationPayload | null {
    const courseId = this.selectedCourseId();
    const periodId = this.selectedPeriodId();
    const subjectId = this.selectedSubjectId();
    const code = dialog.code.trim();
    const name = dialog.name.trim();
    const isDiagnostic = dialog.registrationType === 'DIAGNOSTICA';
    const weight = isDiagnostic
      ? 0
      : dialog.weight == null || Number.isNaN(dialog.weight)
      ? DEFAULT_EVALUATION_WEIGHT
      : Math.max(0, Math.round(dialog.weight * 100) / 100);
    const evaluationDate = dialog.evaluationDate.trim();

    if (!courseId || !periodId || !subjectId) {
      this.snackBar.open('Selecciona curso, periodo y asignatura antes de gestionar evaluaciones', 'Cerrar', {
        duration: 2800
      });
      return null;
    }

    if (!code || !name || !evaluationDate) {
      this.snackBar.open('Completa codigo, nombre y fecha de la evaluacion', 'Cerrar', {
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
      evaluationDate,
      registrationType: dialog.registrationType
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
    const gradeBook = this.currentGradeBook();
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
          score: scoreCell.score,
          conceptCode: scoreCell.conceptCode,
          percentage: scoreCell.percentage
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
    const gradeBook = this.currentGradeBook();
    if (!gradeBook) {
      return;
    }

    const headers = ['Estudiante', ...gradeBook.evaluations.map((evaluation) => evaluation.code), 'Promedio', 'Estado'];
    const rows = gradeBook.students.map((student) => [
      student.fullName,
      ...student.scores.map((score) => gradeBook.subjectEvaluationType === 'CONCEPTUAL'
        ? (score.conceptCode ?? '')
        : score.registrationType === 'DIAGNOSTICA'
          ? (score.conceptCode ?? '')
          : this.exportScore(score.score)),
      gradeBook.subjectEvaluationType === 'CONCEPTUAL'
        ? (student.conceptSummaryCode ?? '')
        : this.exportScore(student.average),
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

  exportJson(): void {
    const selectedCourse = this.selectedCourse();
    if (!selectedCourse || this.isExporting()) {
      return;
    }

    const periods = this.periods().filter((period) => period.schoolYear === selectedCourse.schoolYear);
    if (periods.length === 0) {
      this.snackBar.open('No hay periodos del ano escolar para exportar', 'Cerrar', { duration: 2800 });
      return;
    }

    this.isExporting.set(true);
    forkJoin(
      periods.map((period) => this.buildPeriodExport(selectedCourse.id, period.id))
    ).subscribe({
      next: (periodExports) => {
        const payload = {
          generatedAt: new Date().toISOString(),
          generatedBy: this.user()?.nombre ?? 'Usuario',
          course: {
            id: selectedCourse.id,
            name: selectedCourse.name,
            schoolYear: selectedCourse.schoolYear
          },
          currentSelection: {
            periodId: this.selectedPeriodId(),
            subjectId: this.selectedSubjectId(),
            tab: this.activeTab()
          },
          yearHistory: {
            schoolYear: selectedCourse.schoolYear,
            periods: periodExports
          }
        };

        this.downloadBlob(
          new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
          `evaluaciones-export-${this.slug(selectedCourse.name)}-${selectedCourse.schoolYear}.json`
        );
        this.isExporting.set(false);
        this.snackBar.open('JSON anual descargado correctamente', 'Cerrar', { duration: 2600 });
      },
      error: () => {
        this.isExporting.set(false);
        this.snackBar.open('No fue posible exportar el JSON anual de evaluaciones', 'Cerrar', { duration: 3200 });
      }
    });
  }

  exportDisabledMessage(format: 'word' | 'pdf'): string {
    return `${format.toUpperCase()} estara disponible proximamente. Por ahora puedes usar JSON o Excel.`;
  }

  async exportStudentPdf(student: StudentGradeCard): Promise<void> {
    await this.exportReportsPdf([student], `informe-${this.slug(student.fullName)}.pdf`);
  }

  async exportPedagogicalStudentPdf(student: StudentGradeCard | null = this.activeReportStudent()): Promise<void> {
    if (!student) {
      this.snackBar.open('Selecciona un estudiante para descargar el informe pedagogico', 'Cerrar', { duration: 2600 });
      return;
    }
    await this.exportPedagogicalReportsPdf([student], `informe-pedagogico-${this.slug(student.fullName)}.pdf`);
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
    this.selectedProfileExpandedSubjectId.set(null);
  }

  updateProfileRunSearch(value: string): void {
    this.profileRunSearchTerm.set(value);
  }

  toggleProfileSubject(subjectId: number): void {
    this.selectedProfileExpandedSubjectId.update((current) => current === subjectId ? null : subjectId);
  }

  isProfileSubjectExpanded(subjectId: number): boolean {
    return this.selectedProfileExpandedSubjectId() === subjectId;
  }

  updateReportStudent(studentId: number | null): void {
    this.selectedReportStudentId.set(studentId);
    this.selectedReportSubjectId.set(null);
  }

  updateReportRunSearch(value: string): void {
    this.reportRunSearchTerm.set(value);
  }

  toggleReportSubject(subjectId: number): void {
    this.selectedReportSubjectId.update((current) => current === subjectId ? null : subjectId);
  }

  isReportSubjectExpanded(subjectId: number): boolean {
    return this.selectedReportSubjectId() === subjectId;
  }

  async openReportPreview(student: StudentGradeCard | null = this.activeReportStudent()): Promise<void> {
    if (!student) {
      return;
    }
    await this.ensureReportDetailBooks();
    await this.ensureReportAttendanceRates();
    this.observationDraft.set(this.savedObservations()[student.studentId] ?? this.buildDefaultObservation(student));
    this.previewStudent.set(student);
    this.isReportPreviewOpen.set(true);
  }

  closeReportPreview(): void {
    this.isReportPreviewOpen.set(false);
    this.previewStudent.set(null);
    this.observationDraft.set('');
  }

  async openPedagogicalPreview(student: StudentGradeCard | null = this.activeReportStudent()): Promise<void> {
    if (!student) {
      return;
    }
    let report: PedagogicalReportView;
    try {
      report = await this.ensurePedagogicalReport(student);
    } catch {
      report = this.buildLocalPedagogicalReport(student);
      this.snackBar.open('Se abrio una vista local del informe pedagogico', 'Cerrar', { duration: 2600 });
    }
    this.previewStudent.set(student);
    this.pedagogicalDraft.set(report);
    this.isPedagogicalPreviewOpen.set(true);
  }

  async openPedagogicalSheetPreview(student: StudentGradeCard | null = this.activeReportStudent()): Promise<void> {
    if (!student) {
      return;
    }
    let report: PedagogicalReportView;
    try {
      report = await this.ensurePedagogicalReport(student);
    } catch {
      report = this.buildLocalPedagogicalReport(student);
      this.snackBar.open('Se abrio una vista local del informe pedagogico', 'Cerrar', { duration: 2600 });
    }
    this.previewStudent.set(student);
    this.pedagogicalDraft.set(report);
    this.isPedagogicalSheetPreviewOpen.set(true);
  }

  closePedagogicalSheetPreview(): void {
    this.isPedagogicalSheetPreviewOpen.set(false);
    this.pedagogicalDraft.set(null);
  }

  printPedagogicalPreview(): void {
    const body = document.body;
    const cleanup = () => {
      body.classList.remove('pedagogical-print-mode');
      window.removeEventListener('afterprint', cleanup);
    };

    body.classList.add('pedagogical-print-mode');
    window.addEventListener('afterprint', cleanup, { once: true });

    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => {
        if (body.classList.contains('pedagogical-print-mode')) {
          cleanup();
        }
      }, 1200);
    }, 80);
  }

  closePedagogicalPreview(): void {
    this.isPedagogicalPreviewOpen.set(false);
    this.pedagogicalDraft.set(null);
  }

  async savePedagogicalPreview(): Promise<void> {
    const draft = this.pedagogicalDraft();
    if (!draft) {
      return;
    }

    try {
      const payload: SavePedagogicalReportPayload = {
        courseId: draft.courseId,
        periodId: draft.periodId,
        studentId: draft.studentId,
        content: draft.content
      };
      const saved = await firstValueFrom(this.gradeApiService.savePedagogicalReport(payload));
      this.pedagogicalReports.update((current) => ({ ...current, [saved.studentId]: saved }));
      this.persistPedagogicalReportLocally(saved);
      this.pedagogicalDraft.set(saved);
      this.snackBar.open('Informe pedagogico guardado', 'Cerrar', { duration: 2200 });
    } catch {
      this.pedagogicalReports.update((current) => ({ ...current, [draft.studentId]: draft }));
      this.persistPedagogicalReportLocally(draft);
      this.snackBar.open('Informe pedagogico guardado localmente', 'Cerrar', { duration: 2600 });
    }
  }

  savePreviewObservation(): void {
    const student = this.previewStudent();
    if (!student) {
      return;
    }

    const value = this.observationDraft().trim();
    this.savedObservations.update((current) => ({
      ...current,
      [student.studentId]: value || this.buildDefaultObservation(student)
    }));
    this.snackBar.open('Observacion guardada en la vista previa', 'Cerrar', { duration: 2200 });
  }

  updateProfileSubject(subjectId: number | null): void {
    this.selectedSubjectId.set(subjectId);
    this.selectedProfileExpandedSubjectId.set(null);
  }

  profileSubjectsFor(student: StudentGradeCard | null) {
    if (!student) {
      return [];
    }

    const selectedSubjectId = this.selectedSubjectId();
    if (selectedSubjectId == null) {
      return student.subjects;
    }

    return student.subjects.filter((subject) => subject.subjectId === selectedSubjectId);
  }

  profileStudentAverage(student: StudentGradeCard | null): number | null {
    if (!student) {
      return null;
    }

    const selectedSubjectId = this.selectedSubjectId();
    if (selectedSubjectId == null) {
      return student.overallAverage;
    }

    return student.subjects.find((subject) => subject.subjectId === selectedSubjectId)?.average ?? null;
  }

  profileCompletedSubjects(student: StudentGradeCard | null): number {
    return this.profileSubjectsFor(student).filter((subject) => subject.average != null || subject.conceptSummaryCode != null).length;
  }

  profileAtRiskSubjects(student: StudentGradeCard | null): number {
    return this.profileSubjectsFor(student).filter((subject) => this.subjectIsAtRisk(subject)).length;
  }

  profileOutstandingSubjects(student: StudentGradeCard | null): number {
    return this.profileSubjectsFor(student).filter((subject) => subject.average != null && subject.average >= 6).length;
  }

  profileAverageWidth(value: number | null | undefined): number {
    if (value == null) {
      return 0;
    }

    return Math.max(0, Math.min(100, (value / 7) * 100));
  }

  profileTrendLabel(student: StudentGradeCard | null): string {
    if (!student) {
      return 'Selecciona un estudiante para revisar su rendimiento.';
    }

    if (student.overallAverage == null) {
      return 'Aun no registra notas en este periodo.';
    }

    if (student.overallAverage >= 6) {
      return 'Rendimiento destacado en el periodo actual.';
    }

    if (student.overallAverage >= 4) {
      return 'Rendimiento estable con margen de mejora.';
    }

    return 'Requiere acompanamiento en asignaturas clave.';
  }

  reportStudentRank(student: StudentGradeCard | null): number | null {
    if (!student) {
      return null;
    }

    const index = this.reportRankedStudents().findIndex((item) => item.studentId === student.studentId);
    return index >= 0 ? index + 1 : null;
  }

  reportCompletionLabel(student: StudentGradeCard | null): string {
    if (!student) {
      return 'Sin estudiante seleccionado.';
    }

    const completed = this.profileCompletedSubjects(student);
    const total = student.subjects.length;
    if (total === 0) {
      return 'Sin asignaturas registradas en este periodo.';
    }

    if (completed === total) {
      return 'Informe completo en todas las asignaturas.';
    }

    return `${completed} de ${total} asignaturas con promedio registrado.`;
  }

  pdfObservationText(student: StudentGradeCard | null): string {
    if (!student) {
      return '';
    }
    return this.savedObservations()[student.studentId] ?? this.buildDefaultObservation(student);
  }

  pdfObservationLines(student: StudentGradeCard | null): string[] {
    return this.pdfObservationText(student)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  pdfScore(value: number | null | undefined): string {
    return value == null ? '-' : value.toFixed(1).replace('.', ',');
  }

  scoreInputValue(value: number | null | undefined): string {
    return value == null ? '' : value.toFixed(1);
  }

  isDiagnosticCell(score: GradeBookStudentRow['scores'][number]): boolean {
    return score.registrationType === 'DIAGNOSTICA';
  }

  isProcessCell(score: GradeBookStudentRow['scores'][number]): boolean {
    return score.registrationType === 'PROCESO';
  }

  gradeBookAverageDisplay(student: GradeBookStudentRow): string {
    if (this.isConceptualGradeBook()) {
      return student.conceptSummaryCode || '-';
    }

    if (student.average != null) {
      return this.formatScore(student.average);
    }

    return student.conceptSummaryCode || '-';
  }

  gradeBookAverageToneClass(student: GradeBookStudentRow): string {
    if (this.isConceptualGradeBook()) {
      return this.conceptToneClass(student.conceptSummaryCode);
    }

    if (student.average != null) {
      return this.scoreToneClass(student.average);
    }

    return this.conceptToneClass(student.conceptSummaryCode);
  }

  evaluationEntryValue(
    entry: { score: number | null; conceptCode: string | null; percentage: number | null; registrationType: GradeRegistrationType },
    evaluationType: 'NUMERICA' | 'CONCEPTUAL'
  ): string {
    if (evaluationType === 'CONCEPTUAL') {
      return entry.conceptCode || '-';
    }
    if (entry.registrationType === 'DIAGNOSTICA') {
      return entry.conceptCode || '-';
    }
    return this.formatScore(entry.score);
  }

  evaluationEntryToneClass(
    entry: { score: number | null; conceptCode: string | null; registrationType: GradeRegistrationType },
    evaluationType: 'NUMERICA' | 'CONCEPTUAL'
  ): string {
    if (evaluationType === 'CONCEPTUAL') {
      return this.conceptToneClass(entry.conceptCode);
    }
    if (entry.registrationType === 'DIAGNOSTICA') {
      return this.conceptToneClass(entry.conceptCode);
    }
    return this.scoreToneClass(entry.score);
  }

  registrationTypeLabel(registrationType: GradeRegistrationType | null | undefined): string {
    switch (registrationType) {
      case 'DIAGNOSTICA':
        return 'Diagnostica';
      case 'PROCESO':
        return 'Proceso';
      default:
        return 'Sumativa';
    }
  }

  evaluationCodePlaceholder(registrationType: GradeRegistrationType | null | undefined): string {
    switch (registrationType) {
      case 'DIAGNOSTICA':
        return 'DG1';
      case 'PROCESO':
        return 'NC1';
      default:
        return 'N1';
    }
  }

  evaluationNamePlaceholder(registrationType: GradeRegistrationType | null | undefined): string {
    switch (registrationType) {
      case 'DIAGNOSTICA':
        return 'Evaluacion diagnostica';
      case 'PROCESO':
        return 'Nota de proceso';
      default:
        return 'Evaluacion de unidad';
    }
  }

  pdfConcept(value: number | null | undefined): string {
    if (value == null) {
      return 'Pendiente';
    }
    if (value >= 6) {
      return 'Destacado';
    }
    if (value >= 4) {
      return 'Logrado';
    }
    return 'En riesgo';
  }

  conceptLabel(conceptCode: string | null | undefined): string {
    switch ((conceptCode ?? '').trim().toUpperCase()) {
      case 'L': return 'Logrado';
      case 'ML': return 'Medianamente logrado';
      case 'PL': return 'Por lograr';
      case 'NL': return 'No logrado';
      case 'I': return 'Iniciado';
      case 'EP': return 'En proceso';
      case 'OA': return 'Objetivo alcanzado';
      default: return 'Sin registro';
    }
  }

  conceptToneClass(conceptCode: string | null | undefined): string {
    switch ((conceptCode ?? '').trim().toUpperCase()) {
      case 'L':
      case 'OA':
        return 'is-high';
      case 'ML':
      case 'EP':
      case 'I':
        return 'is-mid';
      case 'PL':
      case 'NL':
        return 'is-low';
      default:
        return 'is-empty';
    }
  }

  pdfConceptClass(value: number | null | undefined): string {
    if (value == null) {
      return 'is-empty';
    }
    if (value >= 6) {
      return 'is-high';
    }
    if (value >= 4) {
      return 'is-mid';
    }
    return 'is-low';
  }

  pdfAcademicStatus(value: number | null | undefined): string {
    return value != null && value >= 4 ? 'APROBADO' : 'EN REVISION';
  }

  pdfAcademicStatusClass(value: number | null | undefined): string {
    return value != null && value >= 4 ? 'is-approved' : 'is-review';
  }

  pdfSchoolYear(): number {
    return this.selectedCourse()?.schoolYear ?? new Date().getFullYear();
  }

  pdfIssueDate(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  }

  pdfTeacherName(): string {
    return this.pdfText(this.user()?.nombre?.trim() || 'Profesor jefe');
  }

  pdfStudentAttendance(student: StudentGradeCard | null): string {
    if (!student) {
      return '0%';
    }

    if (student.attendancePercentage != null) {
      return `${student.attendancePercentage}%`;
    }

    const percentage = this.resolveReportAttendanceRate(student);
    return `${percentage ?? 0}%`;
  }

  pdfStudentAttendanceWidth(student: StudentGradeCard | null): number {
    if (!student) {
      return 0;
    }

    if (student.attendancePercentage != null) {
      return student.attendancePercentage;
    }

    return this.resolveReportAttendanceRate(student) ?? 0;
  }

  pdfText(value: string | null | undefined): string {
    return normalizeDashboardText(value ?? '');
  }

  pdfPeriodLabel(): string {
    return this.pdfText(this.selectedPeriod()?.name ?? '');
  }

  pdfCourseLabel(): string {
    return this.pdfText(this.selectedCourse()?.name ?? '');
  }

  pdfSubjectScore(student: StudentGradeCard, subjectId: number, index: number): number | null {
    return this.pdfSubjectDetail(student, subjectId).scores[index] ?? null;
  }

  pdfSubjectConceptCode(student: StudentGradeCard, subjectId: number, index: number): string | null {
    return this.pdfSubjectDetail(student, subjectId).concepts[index] ?? null;
  }

  pdfSubjectAverage(student: StudentGradeCard, subjectId: number, fallbackAverage: number | null | undefined): number | null {
    const detailAverage = this.pdfSubjectDetail(student, subjectId).average;
    return detailAverage ?? fallbackAverage ?? null;
  }

  pdfSubjectAverageConceptCode(student: StudentGradeCard, subjectId: number, fallbackConceptCode: string | null | undefined): string | null {
    return this.pdfSubjectDetail(student, subjectId).conceptSummaryCode ?? fallbackConceptCode ?? null;
  }

  pdfSubjectDisplayScore(student: StudentGradeCard, subjectId: number, index: number): string {
    const detail = this.pdfSubjectDetail(student, subjectId);
    if (detail.evaluationType === 'CONCEPTUAL') {
      return detail.concepts[index] ?? '-';
    }
    if (detail.registrationTypes[index] === 'DIAGNOSTICA') {
      return detail.concepts[index] ?? '-';
    }
    return this.pdfScore(detail.scores[index] ?? null);
  }

  pdfSubjectDisplayAverage(student: StudentGradeCard, subjectId: number, fallbackAverage: number | null | undefined, fallbackConceptCode: string | null | undefined): string {
    const detail = this.pdfSubjectDetail(student, subjectId);
    if (detail.evaluationType === 'CONCEPTUAL') {
      return detail.conceptSummaryCode ?? fallbackConceptCode ?? '-';
    }
    const diagnosticConcept = detail.evaluations
      .find((entry) => entry.registrationType === 'DIAGNOSTICA' && entry.conceptCode)
      ?.conceptCode ?? null;
    if ((detail.average ?? fallbackAverage ?? null) == null && diagnosticConcept) {
      return diagnosticConcept;
    }
    return this.pdfScore(detail.average ?? fallbackAverage ?? null);
  }

  pdfSubjectDisplayConcept(student: StudentGradeCard, subjectId: number, fallbackAverage: number | null | undefined, fallbackConceptCode: string | null | undefined): string {
    const detail = this.pdfSubjectDetail(student, subjectId);
    if (detail.evaluationType === 'CONCEPTUAL') {
      return this.conceptLabel(detail.conceptSummaryCode ?? fallbackConceptCode ?? null);
    }
    const diagnosticConcept = detail.evaluations
      .find((entry) => entry.registrationType === 'DIAGNOSTICA' && entry.conceptCode)
      ?.conceptCode ?? null;
    if ((detail.average ?? fallbackAverage ?? null) == null && diagnosticConcept) {
      return this.conceptLabel(diagnosticConcept);
    }
    return this.pdfConcept(detail.average ?? fallbackAverage ?? null);
  }

  pdfSubjectDisplayClass(student: StudentGradeCard, subjectId: number, index: number): string {
    const detail = this.pdfSubjectDetail(student, subjectId);
    if (detail.evaluationType === 'CONCEPTUAL') {
      return this.conceptToneClass(detail.concepts[index] ?? null);
    }
    if (detail.registrationTypes[index] === 'DIAGNOSTICA') {
      return this.conceptToneClass(detail.concepts[index] ?? null);
    }
    return this.pdfConceptClass(detail.scores[index] ?? null);
  }

  pdfSubjectAverageClass(student: StudentGradeCard, subjectId: number, fallbackAverage: number | null | undefined, fallbackConceptCode: string | null | undefined): string {
    const detail = this.pdfSubjectDetail(student, subjectId);
    if (detail.evaluationType === 'CONCEPTUAL') {
      return this.conceptToneClass(detail.conceptSummaryCode ?? fallbackConceptCode ?? null);
    }
    const diagnosticConcept = detail.evaluations
      .find((entry) => entry.registrationType === 'DIAGNOSTICA' && entry.conceptCode)
      ?.conceptCode ?? null;
    if ((detail.average ?? fallbackAverage ?? null) == null && diagnosticConcept) {
      return this.conceptToneClass(diagnosticConcept);
    }
    return this.pdfConceptClass(detail.average ?? fallbackAverage ?? null);
  }

  reportSubjectScores(student: StudentGradeCard, subjectId: number): Array<number | null> {
    return this.pdfSubjectDetail(student, subjectId).scores;
  }

  reportSubjectConcepts(student: StudentGradeCard, subjectId: number): Array<string | null> {
    return this.pdfSubjectDetail(student, subjectId).concepts;
  }

  reportSubjectEntries(student: StudentGradeCard, subjectId: number): Array<{ label: string; score: number | null; conceptCode: string | null; percentage: number | null; registrationType: GradeRegistrationType }> {
    return this.pdfSubjectDetail(student, subjectId).evaluations;
  }

  profileSubjectScores(student: StudentGradeCard, subjectId: number): Array<number | null> {
    return this.pdfSubjectDetail(student, subjectId).scores;
  }

  profileSubjectEntries(student: StudentGradeCard, subjectId: number): Array<{ label: string; score: number | null; conceptCode: string | null; percentage: number | null; registrationType: GradeRegistrationType }> {
    return this.pdfSubjectDetail(student, subjectId).evaluations;
  }

  shortSubjectName(subjectName: string): string {
    return subjectName.length > 12 ? `${subjectName.slice(0, 12)}...` : subjectName;
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
    return value == null ? '-' : value.toFixed(1);
  }

  trackStudent(index: number, student: { studentId: number }): number {
    return student.studentId;
  }

  trackArea(index: number, area: PedagogicalReportArea): string {
    return area.key;
  }

  trackSimple(index: number): number {
    return index;
  }

  pedagogicalRecommendationValue(index: number): string {
    return this.pedagogicalDraft()?.content.familyRecommendations[index] ?? '';
  }

  setPedagogicalItemAnswer(areaKey: string, itemIndex: number, answer: PedagogicalAnswer): void {
    this.updatePedagogicalArea(areaKey, (area) => ({
      ...area,
      items: area.items.map((item, index) => index !== itemIndex ? item : { ...item, answer })
    }));
  }

  updatePedagogicalAreaObservation(areaKey: string, value: string): void {
    this.updatePedagogicalArea(areaKey, (area) => ({
      ...area,
      observation: value
    }));
  }

  updatePedagogicalRecommendation(index: number, value: string): void {
    this.pedagogicalDraft.update((current) => {
      if (!current) {
        return current;
      }
      const familyRecommendations = [''];
      familyRecommendations[0] = index === 0 ? value : (current.content.familyRecommendations[0] ?? '');
      return {
        ...current,
        content: {
          ...current.content,
          familyRecommendations
        }
      };
    });
  }

  updatePedagogicalField(
    field: 'documentTitle' | 'educatorName' | 'teacherSignatureName' | 'guardianSignatureLabel',
    value: string
  ): void {
    this.pedagogicalDraft.update((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        content: {
          ...current.content,
          [field]: value
        }
      };
    });
  }

  updatePedagogicalAttitudeObservation(value: string): void {
    this.pedagogicalDraft.update((current) => {
      if (!current || !current.content.attitudeArea) {
        return current;
      }
      return {
        ...current,
        content: {
          ...current.content,
          attitudeArea: {
            ...current.content.attitudeArea,
            observation: value
          }
        }
      };
    });
  }

  setPedagogicalAttitudeItemAnswer(itemIndex: number, answer: PedagogicalAnswer): void {
    this.pedagogicalDraft.update((current) => {
      if (!current || !current.content.attitudeArea) {
        return current;
      }
      return {
        ...current,
        content: {
          ...current.content,
          attitudeArea: {
            ...current.content.attitudeArea,
            items: current.content.attitudeArea.items.map((item, index) =>
              index !== itemIndex ? item : { ...item, answer }
            )
          }
        }
      };
    });
  }

  pedagogicalBadgeClass(levelCode: string | null | undefined): string {
    return levelCode === 'KINDER' ? 'badge-kin' : 'badge-pre';
  }

  pedagogicalAnswerLabel(answer: PedagogicalAnswer | null | undefined): string {
    return answer === 'SI' ? 'Si' : answer === 'EP' ? 'Ep' : 'No';
  }

  pedagogicalCheckClass(answer: PedagogicalAnswer | null | undefined): string {
    if (answer === 'SI') {
      return 'dot-si';
    }
    if (answer === 'EP') {
      return 'dot-ep';
    }
    return 'dot-no';
  }

  nextPedagogicalAnswer(answer: PedagogicalAnswer | null | undefined): PedagogicalAnswer {
    if (answer === 'NO') {
      return 'SI';
    }
    if (answer === 'SI') {
      return 'EP';
    }
    return 'NO';
  }

  private normalizePedagogicalQuestionText(value: string | null | undefined): string {
    return normalizeDashboardText(value ?? '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  async openPedagogicalAreaEditor(area: PedagogicalReportArea, isAttitude = false): Promise<void> {
    const draft = this.pedagogicalDraft();
    if (!draft) {
      return;
    }

    const bank = await this.ensurePedagogicalQuestionBank(draft.levelCode);
    const bankArea = bank.find((entry) => entry.key === area.key && entry.questionKind === 'AREA');
    if (!bankArea) {
      this.snackBar.open('No hay preguntas configuradas para esta area', 'Cerrar', { duration: 2600 });
      return;
    }

    const mergedQuestions = [...bankArea.questions];
    for (const item of area.items) {
      const normalizedLabel = this.normalizePedagogicalQuestionText(item.label);
      const exists = mergedQuestions.some((question) =>
        this.normalizePedagogicalQuestionText(question.label) === normalizedLabel
      );
      if (!exists) {
        mergedQuestions.unshift({
          id: -1 * (mergedQuestions.length + 1),
          label: item.label,
          sortOrder: 0
        });
      }
    }

    const selectedQuestionIds = area.items
      .map((item) => item.questionId ?? mergedQuestions.find((question) =>
        this.normalizePedagogicalQuestionText(question.label) === this.normalizePedagogicalQuestionText(item.label)
      )?.id ?? null)
      .filter((id): id is number => id != null)
      .slice(0, 4);

    this.pedagogicalAreaEditor.set({
      areaKey: area.key,
      areaTitle: area.title,
      isAttitude,
      selectedQuestionIds,
      questions: mergedQuestions
    });
  }

  closePedagogicalAreaEditor(): void {
    this.pedagogicalAreaEditor.set(null);
  }

  pedagogicalEditorQuestions(): Array<{ id: number; label: string; sortOrder: number }> {
    const editor = this.pedagogicalAreaEditor();
    if (!editor) {
      return [];
    }
    return editor.questions;
  }

  isPedagogicalQuestionSelected(questionId: number): boolean {
    return this.pedagogicalAreaEditor()?.selectedQuestionIds.includes(questionId) ?? false;
  }

  togglePedagogicalQuestionSelection(questionId: number): void {
    this.pedagogicalAreaEditor.update((current) => {
      if (!current) {
        return current;
      }

      if (current.selectedQuestionIds.includes(questionId)) {
        return {
          ...current,
          selectedQuestionIds: current.selectedQuestionIds.filter((id) => id !== questionId)
        };
      }

      if (current.selectedQuestionIds.length >= 4) {
        this.snackBar.open('Solo puedes seleccionar 4 preguntas por area', 'Cerrar', { duration: 2600 });
        return current;
      }

      return {
        ...current,
        selectedQuestionIds: [...current.selectedQuestionIds, questionId]
      };
    });
  }

  applyPedagogicalAreaSelection(): void {
    const editor = this.pedagogicalAreaEditor();
    const draft = this.pedagogicalDraft();
    if (!editor || !draft) {
      return;
    }

    if (editor.selectedQuestionIds.length !== 4) {
      this.snackBar.open('Debes seleccionar exactamente 4 preguntas por area', 'Cerrar', { duration: 2600 });
      return;
    }

    const questionMap = new Map(this.pedagogicalEditorQuestions().map((question) => [question.id, question]));
    const currentArea = editor.isAttitude
      ? draft.content.attitudeArea
      : draft.content.developmentAreas.find((area) => area.key === editor.areaKey) ?? null;
    const currentAnswers = new Map((currentArea?.items ?? []).map((item) => [this.normalizePedagogicalQuestionText(item.label), item.answer]));

    const items = editor.selectedQuestionIds
      .map((questionId) => questionMap.get(questionId))
      .filter((question): question is { id: number; label: string; sortOrder: number } => !!question)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((question) => ({
        questionId: question.id > 0 ? question.id : null,
        label: question.label,
        answer: currentAnswers.get(this.normalizePedagogicalQuestionText(question.label)) ?? 'NO'
      }));

    if (editor.isAttitude) {
      this.pedagogicalDraft.update((current) => {
        if (!current || !current.content.attitudeArea) {
          return current;
        }
        return {
          ...current,
          content: {
            ...current.content,
            attitudeArea: {
              ...current.content.attitudeArea,
              items
            }
          }
        };
      });
    } else {
      this.updatePedagogicalArea(editor.areaKey, (area) => ({
        ...area,
        items
      }));
    }

    this.pedagogicalAreaEditor.set(null);
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
      return 'Sin ponderacion';
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
    const subjectId = this.selectedSubjectId();
    if (!courseId || !periodId) {
      return;
    }

    const requestId = ++this.gradeBookRequestId;
    this.isLoading.set(true);
    this.gradeApiService.getGradeBook(courseId, periodId, subjectId).subscribe({
      next: (view) => {
        if (requestId !== this.gradeBookRequestId || courseId !== this.selectedCourseId() || periodId !== this.selectedPeriodId()) {
          return;
        }
        this.gradeBook.set(view);
        this.gradeBookNotice.set(null);
        this.selectedSubjectId.set(view.subjectId);
        this.gradeBookSearch.set('');
        this.closeDraftEvaluationDialog();
        this.closeEvaluationDetails();
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (requestId !== this.gradeBookRequestId) {
          return;
        }
        this.isLoading.set(false);
        const translatedMessage = this.translateGradeErrorMessage(error.error?.message);
        if (translatedMessage) {
          this.gradeBook.set(null);
          this.gradeBookNotice.set(translatedMessage);
          this.selectedSubjectId.set(null);
          this.gradeBookSearch.set('');
          this.closeDraftEvaluationDialog();
          this.closeEvaluationDetails();
          this.snackBar.open(translatedMessage, 'Cerrar', { duration: 3600 });
          return;
        }
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

    const requestId = ++this.profileRequestId;
    this.isLoading.set(true);
    this.gradeApiService.getStudentProfile(courseId, periodId).subscribe({
      next: (view) => {
        if (requestId !== this.profileRequestId || courseId !== this.selectedCourseId() || periodId !== this.selectedPeriodId()) {
          return;
        }
        this.studentProfile.set(view);
        const currentStudentId = this.selectedProfileStudentId();
        const hasSelectedStudent = view.students.some((student) => student.studentId === currentStudentId);
        this.selectedProfileStudentId.set(hasSelectedStudent ? currentStudentId : (view.students[0]?.studentId ?? null));
        this.selectedProfileExpandedSubjectId.set(null);
        this.isLoading.set(false);
        void this.ensureReportDetailBooks();
      },
      error: (error: HttpErrorResponse) => {
        if (requestId !== this.profileRequestId) {
          return;
        }
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

    const requestId = ++this.reportsRequestId;
    this.isLoading.set(true);
    this.gradeApiService.getReports(courseId, periodId).subscribe({
      next: (view) => {
        if (requestId !== this.reportsRequestId || courseId !== this.selectedCourseId() || periodId !== this.selectedPeriodId()) {
          return;
        }
        this.reports.set(view);
        this.reportAttendanceRates.set(
          Object.fromEntries(
            view.students.map((student) => [student.studentId, student.attendancePercentage ?? null])
          ) as Record<number, number | null>
        );
        const currentStudentId = this.selectedReportStudentId();
        const hasSelectedStudent = view.students.some((student) => student.studentId === currentStudentId);
        this.selectedReportStudentId.set(hasSelectedStudent ? currentStudentId : (view.students[0]?.studentId ?? null));
        this.selectedReportSubjectId.set(null);
        this.isLoading.set(false);
        void this.ensureReportDetailBooks();
        void this.ensureReportAttendanceRates();
      },
      error: (error: HttpErrorResponse) => {
        if (requestId !== this.reportsRequestId) {
          return;
        }
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar los informes de notas');
      }
    });
  }

  private rebuildStudentRow(
    student: GradeBookStudentRow,
    evaluationType: 'NUMERICA' | 'CONCEPTUAL' = this.currentGradeBook()?.subjectEvaluationType ?? 'NUMERICA'
  ): GradeBookStudentRow {
    const latestConceptSummaryCode = [...student.scores]
      .reverse()
      .find((cell) => cell.conceptCode != null && cell.conceptCode.trim().length > 0)
      ?.conceptCode ?? null;

    if (evaluationType === 'CONCEPTUAL') {
      return {
        ...student,
        average: null,
        conceptSummaryCode: latestConceptSummaryCode,
        status: this.conceptLabel(latestConceptSummaryCode)
      };
    }

    const validScores = student.scores
      .filter((cell) => cell.registrationType !== 'DIAGNOSTICA')
      .map((cell) => cell.score)
      .filter((score): score is number => score != null);
    const average = validScores.length === 0
      ? null
      : Math.round((validScores.reduce((total, score) => total + score, 0) / validScores.length) * 10) / 10;

    return {
      ...student,
      average,
      status: average != null ? this.resolveStatus(average) : this.conceptLabel(latestConceptSummaryCode),
      conceptSummaryCode: average == null ? latestConceptSummaryCode : null
    };
  }

  private calculateSummary(students: GradeBookStudentRow[]): GradeBookSummary {
    if (this.currentGradeBook()?.subjectEvaluationType === 'CONCEPTUAL') {
      const registered = students.filter((student) => student.conceptSummaryCode != null).length;
      return {
        courseAverage: null,
        aboveMinimumCount: 0,
        belowMinimumCount: 0,
        ungradedCount: students.length - registered
      };
    }

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

  private subjectIsAtRisk(subject: StudentGradeCard['subjects'][number]): boolean {
    if (subject.evaluationType === 'CONCEPTUAL') {
      return ['PL', 'NL'].includes(subject.conceptSummaryCode ?? '');
    }
    return subject.average != null && subject.average < 4;
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
      await this.ensureReportDetailBooks();
      await this.ensureReportAttendanceRates();
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, precision: 12 });
      let firstPage = true;

      for (const student of students) {
        this.pdfStudent.set(student);
        await this.waitForRender();

        const renderScale = 2.5;
        const canvas = await html2canvas(template, {
          backgroundColor: '#ffffff',
          scale: renderScale,
          useCORS: true,
          logging: false,
          imageTimeout: 0
        });
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
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, width, height, undefined, 'MEDIUM');
      }

      pdf.save(fileName);
      this.snackBar.open('Informe de notas generado correctamente', 'Cerrar', { duration: 2600 });
    } catch {
      this.snackBar.open('No fue posible exportar el informe de notas', 'Cerrar', { duration: 3200 });
    } finally {
      this.pdfStudent.set(null);
      this.pdfPedagogicalReport.set(null);
      this.isExporting.set(false);
    }
  }

  private async exportPedagogicalReportsPdf(students: StudentGradeCard[], fileName: string): Promise<void> {
    const template = this.pedagogicalPdfTemplate?.nativeElement;
    if (!template || this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, precision: 12 });
      let firstPage = true;

      for (const student of students) {
        const report = this.pedagogicalDraft()?.studentId === student.studentId
          ? this.pedagogicalDraft()
          : await this.ensurePedagogicalReport(student).catch(() => this.buildLocalPedagogicalReport(student));

        this.pdfPedagogicalReport.set(report);
        await this.waitForRender();

        const canvas = await html2canvas(template, {
          backgroundColor: '#ffffff',
          scale: 2.5,
          useCORS: true,
          logging: false,
          imageTimeout: 0
        });

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
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, width, height, undefined, 'MEDIUM');
      }

      pdf.save(fileName);
      this.snackBar.open('Informe pedagogico generado correctamente', 'Cerrar', { duration: 2600 });
    } catch {
      this.snackBar.open('No fue posible exportar el informe pedagogico', 'Cerrar', { duration: 3200 });
    } finally {
      this.pdfPedagogicalReport.set(null);
      this.isExporting.set(false);
    }
  }

  private waitForRender(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }

  private clearTabState(): void {
    this.gradeBookRequestId += 1;
    this.profileRequestId += 1;
    this.reportsRequestId += 1;
    this.gradeBook.set(null);
    this.studentProfile.set(null);
    this.reports.set(null);
    this.reportDetailBooks.set([]);
    this.reportAttendanceRates.set({});
    this.previewStudent.set(null);
    this.pdfStudent.set(null);
    this.pdfPedagogicalReport.set(null);
    this.pedagogicalAreaEditor.set(null);
    this.pedagogicalDraft.set(null);
    this.pedagogicalReports.set({});
    this.isReportPreviewOpen.set(false);
    this.isPedagogicalPreviewOpen.set(false);
    this.gradeBookNotice.set(null);
    this.gradeBookSearch.set('');
    this.profileRunSearchTerm.set('');
    this.reportRunSearchTerm.set('');
    this.selectedProfileStudentId.set(null);
    this.selectedProfileExpandedSubjectId.set(null);
    this.selectedReportStudentId.set(null);
    this.selectedReportSubjectId.set(null);
    this.closeDraftEvaluationDialog();
    this.closeEvaluationDetails();
  }

  private async ensureReportDetailBooks(): Promise<void> {
    const courseId = this.selectedCourseId();
    const periodId = this.selectedPeriodId();
    if (!courseId || !periodId) {
      this.reportDetailBooks.set([]);
      return;
    }

    const currentBooks = this.reportDetailBooks();
    if (currentBooks.length > 0 && currentBooks.every((book) => book.courseId === courseId && book.periodId === periodId)) {
      return;
    }

    try {
      const initialBook = await firstValueFrom(this.gradeApiService.getGradeBook(courseId, periodId, null));
      const remainingSubjects = (initialBook.subjects ?? []).filter((subject) => subject.id !== initialBook.subjectId);
      const additionalBooks = remainingSubjects.length === 0
        ? []
        : await firstValueFrom(
            forkJoin(
              remainingSubjects.map((subject) =>
                this.gradeApiService.getGradeBook(courseId, periodId, subject.id).pipe(catchError(() => of(null)))
              )
            )
          );

      this.reportDetailBooks.set([initialBook, ...additionalBooks.filter((book): book is GradeBookView => book != null)]);
    } catch {
      this.reportDetailBooks.set([]);
    }
  }

  private async ensureReportAttendanceRates(): Promise<void> {
    const course = this.selectedCourse();
    const period = this.selectedPeriod();
    const reportStudents = this.currentReports()?.students ?? [];
    if (!course || !period || reportStudents.length === 0) {
      this.reportAttendanceRates.set({});
      return;
    }

    const currentRates = this.reportAttendanceRates();
    if (
      reportStudents.every(
        (student) =>
          Object.prototype.hasOwnProperty.call(currentRates, student.studentId) &&
          currentRates[student.studentId] != null
      )
    ) {
      return;
    }

    const summaries = await firstValueFrom(
      forkJoin(
        reportStudents.map((student) =>
          this.attendanceApiService
            .getStudentSummary(course.id, student.studentId, course.schoolYear, period.semester ?? 1)
            .pipe(
              catchError(() =>
                of({
                  studentId: student.studentId,
                  percentage: 0,
                  presentCount: 0,
                  absentCount: 0,
                  lateCount: 0,
                  totalRecords: 0
                })
              )
            )
        )
      )
    );

    const rates = Object.fromEntries(
      summaries.map((summary) => [summary.studentId, Math.max(0, Math.min(100, Math.round(summary.percentage ?? 0)))])
    ) as Record<number, number | null>;

    this.reportAttendanceRates.set(rates);
  }

  private normalizeRunKey(run: string | null | undefined): string {
    return (run ?? '').replace(/[^0-9kK]/g, '').toLowerCase();
  }

  private resolveReportAttendanceRate(student: StudentGradeCard): number | null {
    const rates = this.reportAttendanceRates();
    const directMatch = rates[student.studentId];
    if (directMatch != null) {
      return directMatch;
    }

    const runKey = this.normalizeRunKey(student.run);
    if (!runKey) {
      return directMatch ?? null;
    }

    const matchedStudent = (this.currentReports()?.students ?? []).find(
      (candidate) => this.normalizeRunKey(candidate.run) === runKey
    );
    if (!matchedStudent) {
      return directMatch ?? null;
    }

    return rates[matchedStudent.studentId] ?? directMatch ?? null;
  }

  private pdfSubjectDetail(student: StudentGradeCard, subjectId: number): ReportSubjectDetail {
    const book = this.reportDetailBooks().find((item) => item.subjectId === subjectId);
    if (!book) {
      return { evaluationType: 'NUMERICA', scores: [], concepts: [], percentages: [], registrationTypes: [], average: null, conceptSummaryCode: null, evaluations: [] };
    }

    const studentRow = book.students.find((row) => row.studentId === student.studentId);
    if (!studentRow) {
      return { evaluationType: book.subjectEvaluationType, scores: [], concepts: [], percentages: [], registrationTypes: [], average: null, conceptSummaryCode: null, evaluations: [] };
    }

    const evaluationOrder = new Map(book.evaluations.map((evaluation) => [evaluation.id, evaluation.order]));
    const orderedScores = [...studentRow.scores]
      .sort((left, right) => (evaluationOrder.get(left.evaluationId) ?? 0) - (evaluationOrder.get(right.evaluationId) ?? 0))
      .map((score) => ({
        label: score.code,
        score: score.score ?? null,
        conceptCode: score.conceptCode ?? null,
        percentage: score.percentage ?? null,
        registrationType: score.registrationType ?? 'SUMATIVA'
      }));

    const scores = orderedScores
      .slice(0, 3)
      .map((score) => score.score);
    const concepts = orderedScores
      .slice(0, 3)
      .map((score) => score.conceptCode);
    const percentages = orderedScores
      .slice(0, 3)
      .map((score) => score.percentage);
    const registrationTypes = orderedScores
      .slice(0, 3)
      .map((score) => score.registrationType);

    const hasRealScores = studentRow.scores.some((score) => score.score != null && score.registrationType !== 'DIAGNOSTICA');
    const latestConceptCode = [...studentRow.scores]
      .reverse()
      .find((score) => score.conceptCode != null && score.conceptCode.trim().length > 0)
      ?.conceptCode ?? student.subjects.find((subject) => subject.subjectId === subjectId)?.conceptSummaryCode ?? null;

    return {
      evaluationType: book.subjectEvaluationType,
      scores,
      concepts,
      percentages,
      registrationTypes,
      average: book.subjectEvaluationType === 'CONCEPTUAL' ? null : (hasRealScores ? studentRow.average : null),
      conceptSummaryCode: latestConceptCode,
      evaluations: orderedScores
    };
  }

  private buildDefaultObservation(student: StudentGradeCard): string {
    return [
      this.reportCompletionLabel(student),
      this.profileTrendLabel(student),
      `Documento generado automaticamente desde ConectaSchool el ${this.pdfIssueDate()}.`
    ].join('\n');
  }

  private async ensurePedagogicalReport(student: StudentGradeCard): Promise<PedagogicalReportView> {
    const cached = this.pedagogicalReports()[student.studentId];
    if (cached && cached.courseId === this.selectedCourseId() && cached.periodId === this.selectedPeriodId()) {
      return this.withPedagogicalTeacherDefaults(cached);
    }

    const courseId = this.selectedCourseId();
    const periodId = this.selectedPeriodId();
    if (!courseId || !periodId) {
      throw new Error('Missing course or period');
    }

    const localReport = this.readLocalPedagogicalReport(courseId, periodId, student.studentId);
    if (localReport) {
      const normalizedLocal = this.withPedagogicalTeacherDefaults(localReport);
      this.pedagogicalReports.update((current) => ({ ...current, [student.studentId]: normalizedLocal }));
      return normalizedLocal;
    }

    const report = await firstValueFrom(this.gradeApiService.getPedagogicalReport(courseId, periodId, student.studentId));
    const normalized = this.withPedagogicalTeacherDefaults(report);
    this.pedagogicalReports.update((current) => ({ ...current, [student.studentId]: normalized }));
    return normalized;
  }

  private async ensurePedagogicalQuestionBank(levelCode: 'PREKINDER' | 'KINDER' | 'GENERAL'): Promise<PedagogicalQuestionBankArea[]> {
    const current = this.pedagogicalQuestionBank();
    if (current.length > 0 && this.pedagogicalQuestionBankLevel() === levelCode) {
      return current;
    }

    let bank: PedagogicalQuestionBankArea[] = [];
    try {
      bank = await firstValueFrom(this.gradeApiService.getPedagogicalQuestionBank(levelCode));
    } catch {
      bank = [];
    }
    if (!bank.length) {
      bank = this.buildFallbackPedagogicalQuestionBank(levelCode);
    }
    this.pedagogicalQuestionBank.set(bank);
    this.pedagogicalQuestionBankLevel.set(levelCode);
    return bank;
  }

  private withPedagogicalTeacherDefaults(report: PedagogicalReportView): PedagogicalReportView {
    const teacherName = this.pdfTeacherName();
    return {
      ...report,
      content: {
        ...report.content,
        educatorName: report.content.educatorName || teacherName,
        teacherSignatureName: report.content.teacherSignatureName || teacherName,
        familyRecommendations: this.normalizeSingleFamilyRecommendation(report.content.familyRecommendations)
      }
    };
  }

  private buildLocalPedagogicalReport(student: StudentGradeCard): PedagogicalReportView {
    const course = this.selectedCourse();
    const period = this.selectedPeriod();
    const levelCode = this.resolvePedagogicalLevelCode(course?.name ?? '');
    const levelLabel = levelCode === 'KINDER' ? 'Kinder' : levelCode === 'PREKINDER' ? 'Prekinder' : 'General';
    const report: PedagogicalReportView = {
      courseId: course?.id ?? 0,
      courseName: course?.name ?? '',
      periodId: period?.id ?? 0,
      periodName: period?.name ?? '',
      studentId: student.studentId,
      studentRun: student.run,
      studentName: student.fullName,
      schoolYear: course?.schoolYear ?? new Date().getFullYear(),
      levelCode,
      levelLabel,
      content: {
        documentTitle: 'Informe de avance',
        educatorName: this.pdfTeacherName(),
        developmentAreas: this.defaultPedagogicalAreas(levelCode),
        attitudeArea: this.defaultPedagogicalAttitudeArea(),
        familyRecommendations: [''],
        teacherSignatureName: this.pdfTeacherName(),
        guardianSignatureLabel: 'Recibido conforme - Fecha: ___/___/______'
      }
    };
    return this.withPedagogicalTeacherDefaults(report);
  }

  private normalizeSingleFamilyRecommendation(recommendations: string[] | null | undefined): string[] {
    const firstFilledRecommendation = (recommendations ?? [])
      .map((item) => item?.trim() ?? '')
      .find((item) => item.length > 0);
    return [firstFilledRecommendation ?? ''];
  }

  private resolvePedagogicalLevelCode(courseName: string): 'PREKINDER' | 'KINDER' | 'GENERAL' {
    const normalized = courseName.toLowerCase();
    if (normalized.includes('prek')) {
      return 'PREKINDER';
    }
    if (normalized.includes('kinder')) {
      return 'KINDER';
    }
    return 'GENERAL';
  }

  private buildFallbackPedagogicalQuestionBank(levelCode: 'PREKINDER' | 'KINDER' | 'GENERAL'): PedagogicalQuestionBankArea[] {
    const areaCognitivaQuestions = levelCode === 'KINDER'
      ? [
          'Reconoce colores basicos',
          'Reconoce formas geometricas simples',
          'Distingue tamanos: grande, mediano y pequeno',
          'Clasifica objetos segun color, forma o tamano',
          'Reconoce vocales',
          'Asocia grafema y fonema de las vocales',
          'Reconoce consonantes trabajadas',
          'Cuenta numeros del 1 al 50',
          'Escribe o copia numeros segun su nivel',
          'Participa en juegos simbolicos',
          'Participa en actividades creativas',
          'Resuelve problemas simples con apoyo concreto'
        ]
      : [
          'Reconoce colores basicos',
          'Reconoce formas geometricas simples',
          'Distingue tamanos: grande, mediano y pequeno',
          'Clasifica objetos segun color, forma o tamano',
          'Reconoce vocales',
          'Asocia grafema y fonema de las vocales',
          'Reconoce consonantes trabajadas',
          'Cuenta numeros del 1 al 10',
          'Escribe o copia numeros segun su nivel',
          'Participa en juegos simbolicos',
          'Participa en actividades creativas',
          'Resuelve problemas simples con apoyo concreto'
        ];

    return [
      this.createFallbackQuestionBankArea(1000, 'personal-social', 'Personal y Social', [
        'Establece vinculos positivos con sus pares y adultos.',
        'Expresa sus emociones de manera adecuada.',
        'Comparte materiales y participa en juegos grupales.',
        'Respeta turnos y normas de convivencia.',
        'Resuelve conflictos simples con apoyo o de forma verbal.',
        'Demuestra autonomia en rutinas diarias.',
        'Cuida sus pertenencias y materiales de trabajo.',
        'Se integra de manera positiva a las actividades del grupo.',
        'Demuestra empatia frente a las emociones de sus companeros.',
        'Solicita ayuda cuando lo requiere.'
      ]),
      this.createFallbackQuestionBankArea(2000, 'lenguaje-verbal', 'Lenguaje Verbal', [
        'Comprende instrucciones simples',
        'Comprende instrucciones de dos pasos',
        'Escucha relatos o cuentos con atencion',
        'Responde preguntas sobre cuentos o relatos',
        'Utiliza vocabulario adecuado para su edad',
        'Expresa ideas y necesidades con claridad',
        'Participa en conversaciones grupales',
        'Participa en juegos de palabras',
        'Muestra interes por cuentos y canciones',
        'Participa en dramatizaciones o juegos de roles',
        'Pronuncia palabras de manera comprensible',
        'Reconoce sonidos iniciales de palabras'
      ]),
      this.createFallbackQuestionBankArea(3000, 'area-motriz', 'Area Motriz', [
        'Participa activamente en juegos al aire libre',
        'Corre, salta o se desplaza con coordinacion',
        'Mantiene equilibrio en actividades motrices',
        'Coordina movimientos gruesos en juegos grupales',
        'Utiliza correctamente lapices',
        'Utiliza correctamente tijeras',
        'Utiliza pinceles u otros materiales artisticos',
        'Realiza trazos con intencion',
        'Realiza formas basicas con intencion',
        'Colorea respetando espacios progresivamente',
        'Recorta siguiendo lineas simples',
        'Muestra coordinacion fina en trabajos de mesa'
      ]),
      this.createFallbackQuestionBankArea(4000, 'area-cognitiva', 'Area Cognitiva', areaCognitivaQuestions),
      this.createFallbackQuestionBankArea(5000, 'actitudes-aprendizaje', 'Actitudes y disposicion al aprendizaje', [
        'Muestra interes por las actividades propuestas',
        'Participa con entusiasmo en clases',
        'Respeta normas del aula',
        'Respeta instrucciones de la educadora',
        'Persevera frente a desafios',
        'Finaliza las actividades propuestas',
        'Acepta correcciones o apoyo del adulto',
        'Muestra disposicion para aprender',
        'Explora materiales o actividades nuevas',
        'Mantiene una actitud positiva frente al trabajo escolar'
      ])
    ];
  }

  private createFallbackQuestionBankArea(
    baseId: number,
    key: string,
    title: string,
    labels: string[]
  ): PedagogicalQuestionBankArea {
    return {
      key,
      title,
      questionKind: 'AREA',
      questions: labels.map((label, index) => ({
        id: baseId + index + 1,
        label,
        sortOrder: index + 1
      }))
    };
  }

  private defaultPedagogicalAreas(levelCode: 'PREKINDER' | 'KINDER' | 'GENERAL'): PedagogicalReportArea[] {
    const cognitiveItems = levelCode === 'KINDER'
      ? [
          'Reconoce colores, formas y tamanos',
          'Grafema y fonema de vocales y consonantes M y P',
          'Escritura y conteo de numeros 1 al 50',
          'Juegos simbolicos y actividades creativas'
        ]
      : [
          'Reconoce colores, formas y tamanos',
          'Grafema y fonema de las vocales',
          'Escritura y conteo de numeros 1 al 10',
          'Juegos simbolicos y actividades creativas'
        ];

    return [
      this.createPedagogicalArea('personal-social', 'Personal y Social', 'favorite', '#d1fae5', '#065f46', [
        'Establece vinculos afectivos con pares y adultos',
        'Expresa sus emociones con claridad',
        'Comparte materiales y colabora en grupo',
        'Muestra autonomia en rutinas diarias'
      ]),
      this.createPedagogicalArea('lenguaje-verbal', 'Lenguaje Verbal', 'chat', '#dbeafe', '#1e40af', [
        'Comprende instrucciones simples y relatos',
        'Vocabulario adecuado para su edad',
        'Participa en conversaciones y juegos',
        'Interes por cuentos, canciones y dramatizaciones'
      ]),
      this.createPedagogicalArea('area-motriz', 'Area Motriz', 'directions_run', '#fef3c7', '#92400e', [
        'Control y coordinacion de movimientos',
        'Participa activamente en juegos al aire libre',
        'Utiliza lapices, tijeras y pinceles correctamente',
        'Realiza trazos y formas con intencion'
      ]),
      this.createPedagogicalArea('area-cognitiva', 'Area Cognitiva', 'lightbulb', '#ede9fe', '#5b21b6', cognitiveItems)
    ];
  }

  private defaultPedagogicalAttitudeArea(): PedagogicalReportArea {
    return this.createPedagogicalArea('actitudes-aprendizaje', 'Actitudes y disposicion al aprendizaje', 'stars', '#f0fdf4', '#15803d', [
      'Interes y entusiasmo por actividades',
      'Respeto por las normas del aula',
      'Perseverancia frente a desafios',
      'Disposicion para aprender y explorar'
    ]);
  }

  private createPedagogicalArea(
    key: string,
    title: string,
    icon: string,
    accentColor: string,
    iconColor: string,
    labels: string[]
  ): PedagogicalReportArea {
    return {
      key,
      title,
      icon,
      accentColor,
      iconColor,
      items: labels.map((label) => ({ questionId: null, label, answer: 'NO' as const })),
      observation: ''
    };
  }

  private pedagogicalStorageKey(courseId: number, periodId: number, studentId: number): string {
    return `pedagogical-report:${courseId}:${periodId}:${studentId}`;
  }

  private persistPedagogicalReportLocally(report: PedagogicalReportView): void {
    try {
      localStorage.setItem(
        this.pedagogicalStorageKey(report.courseId, report.periodId, report.studentId),
        JSON.stringify(report)
      );
    } catch {
      // Ignore local storage failures and keep the in-memory cache.
    }
  }

  private readLocalPedagogicalReport(courseId: number, periodId: number, studentId: number): PedagogicalReportView | null {
    try {
      const raw = localStorage.getItem(this.pedagogicalStorageKey(courseId, periodId, studentId));
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as PedagogicalReportView;
    } catch {
      return null;
    }
  }

  private updatePedagogicalArea(areaKey: string, updater: (area: PedagogicalReportArea) => PedagogicalReportArea): void {
    this.pedagogicalDraft.update((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        content: {
          ...current.content,
          developmentAreas: current.content.developmentAreas.map((area) =>
            area.key !== areaKey ? area : updater(area)
          )
        }
      };
    });
  }

  private buildPeriodExport(courseId: number, periodId: number) {
    return this.gradeApiService.getGradeBook(courseId, periodId, null).pipe(
      switchMap((initialBook) => {
        const subjects = initialBook.subjects ?? [];
        const remainingSubjectRequests = subjects
          .filter((subject) => subject.id !== initialBook.subjectId)
          .map((subject) =>
            this.gradeApiService.getGradeBook(courseId, periodId, subject.id).pipe(
              catchError(() => of(null))
            )
          );

        return forkJoin({
          initialBook: of(initialBook),
          additionalBooks: remainingSubjectRequests.length > 0 ? forkJoin(remainingSubjectRequests) : of([]),
          profile: this.gradeApiService.getStudentProfile(courseId, periodId).pipe(catchError(() => of(null))),
          reports: this.gradeApiService.getReports(courseId, periodId).pipe(catchError(() => of(null)))
        });
      }),
      map(({ initialBook, additionalBooks, profile, reports }) => {
        const books = [initialBook, ...additionalBooks.filter((book): book is GradeBookView => book != null)];
        return {
          period: {
            id: periodId,
            name: initialBook.periodName,
            semester: this.periods().find((item) => item.id === periodId)?.semester ?? null
          },
          subjects: books.map((book) => ({
            subjectId: book.subjectId,
            subjectName: book.subjectName,
            evaluations: book.evaluations,
            summary: book.summary,
            students: book.students
          })),
          profile,
          reports
        };
      }),
      catchError(() =>
        of({
          period: {
            id: periodId,
            name: this.periods().find((item) => item.id === periodId)?.name ?? `Periodo ${periodId}`,
            semester: this.periods().find((item) => item.id === periodId)?.semester ?? null
          },
          subjects: [],
          profile: null,
          reports: null
        })
      )
    );
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

  private clampPercentage(value: number): number {
    return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
  }

  private diagnosticConceptCode(percentage: number): string {
    if (percentage < 50) {
      return 'PL';
    }
    if (percentage < 70) {
      return 'ML';
    }
    return 'L';
  }

  private registrationTypeForEvaluation(evaluationId: number): GradeRegistrationType {
    return this.currentGradeBook()?.evaluations.find((item) => item.id === evaluationId)?.registrationType ?? 'SUMATIVA';
  }

  private nextEvaluationNumber(registrationType: GradeRegistrationType): number {
    const evaluations = this.currentGradeBook()?.evaluations ?? [];
    return evaluations.filter((evaluation) => (evaluation.registrationType ?? 'SUMATIVA') === registrationType).length + 1;
  }

  private slug(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }


  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private translateGradeErrorMessage(message: unknown): string | null {
    if (typeof message !== 'string') {
      return null;
    }

    const normalized = message.trim().toLowerCase();
    if (normalized.includes('no active subjects found for the selected course')) {
      return 'No se encontraron asignaturas activas para el curso seleccionado.';
    }

    return null;
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    const translatedMessage = this.translateGradeErrorMessage(error.error?.message);
    this.snackBar.open(translatedMessage ?? (typeof error.error?.message === 'string' ? error.error.message : fallback), 'Cerrar', {
      duration: 3600
    });
  }
}






