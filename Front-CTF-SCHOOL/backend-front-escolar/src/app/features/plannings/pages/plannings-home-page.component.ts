import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  PlanningClass,
  PlanningSummary,
  PlanningSummaryUnit,
  PlanningUnitCatalogAssignment
} from '../../../core/models/planning.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { PlanningApiService } from '../../../core/services/planning-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type PlanningTab = 'units' | 'schedule' | 'class-by-class' | 'evaluations';

type FilterOption<T extends string | number> = {
  value: T;
  label: string;
};

type SummaryItem = {
  label: string;
  value: string;
  icon: string;
  tone: 'violet' | 'blue' | 'amber' | 'emerald' | 'gray';
};

type PlanningUnitCard = {
  id: number;
  unitNumber: number | null;
  title: string;
  period: string;
  description: string;
  classes: number;
  resources: number;
  coverage: number;
  tone: 'violet' | 'emerald' | 'amber' | 'blue';
  statusLabel: string;
  classRows: PlanningUnitClassRow[];
};

type PlanningUnitClassRow = {
  id: number | null;
  unitId: number;
  number: number;
  title: string;
  objective: string;
  statusLabel: string;
  statusTone: 'planned' | 'progress' | 'completed';
  documentsCount: number;
};

type ClassPreviewObjective = {
  code: string;
  description: string;
};

type ClassPreviewPhase = {
  title: string;
  tone: 'violet' | 'emerald' | 'amber';
  description: string;
  duration: string;
};

type ClassByClassCard = {
  id: string;
  classId: number | null;
  unitId: number;
  unitTitle: string;
  unitTone: PlanningUnitCard['tone'];
  classNumber: number;
  title: string;
  objective: string;
  objectiveCode: string;
  statusLabel: string;
  statusTone: PlanningUnitClassRow['statusTone'];
  durationLabel: string;
  dateLabel: string;
  resourcesLabel: string;
  unitLabel: string;
};

type ScheduleMonth = {
  label: string;
  startWeek: number;
  span: number;
};

type ScheduleItem = {
  id: number;
  titulo: string;
  semana: number;
  tipo: 'clase' | 'evaluacion';
};

type ScheduleUnit = {
  id: number;
  numero: number;
  nombre: string;
  icono: string;
  tone: PlanningUnitCard['tone'];
  semanaInicio: number;
  semanaFin: number;
  clases: ScheduleItem[];
  evaluaciones: ScheduleItem[];
};

@Component({
  selector: 'app-plannings-home-page',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './plannings-home-page.component.html',
  styleUrl: './plannings-home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningsHomePageComponent {
  private readonly authStateService = inject(AuthStateService);
  private readonly planningApiService = inject(PlanningApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly user = this.authStateService.user;

  readonly tabs: Array<{ id: PlanningTab; label: string }> = [
    { id: 'units', label: 'Unidades' },
    { id: 'schedule', label: 'Cronograma' },
    { id: 'class-by-class', label: 'Clase a clase' },
    { id: 'evaluations', label: 'Evaluaciones' }
  ];

  readonly semesters: FilterOption<number>[] = [
    { value: 1, label: 'Primer semestre' },
    { value: 2, label: 'Segundo semestre' }
  ];
  readonly scheduleWeeks = Array.from({ length: 16 }, (_, index) => index + 1);
  readonly scheduleMonths = computed<ScheduleMonth[]>(() => {
    return this.selectedSemester() === 2
      ? [
        { label: 'Agosto', startWeek: 1, span: 4 },
        { label: 'Septiembre', startWeek: 5, span: 4 },
        { label: 'Octubre', startWeek: 9, span: 4 },
        { label: 'Noviembre', startWeek: 13, span: 4 }
      ]
      : [
        { label: 'Marzo', startWeek: 1, span: 4 },
        { label: 'Abril', startWeek: 5, span: 4 },
        { label: 'Mayo', startWeek: 9, span: 4 },
        { label: 'Junio', startWeek: 13, span: 4 }
      ];
  });
  readonly currentScheduleWeek = computed<number | null>(() => {
    const year = this.selectedYear();
    const semester = this.selectedSemester();
    if (year == null || semester == null) {
      return null;
    }

    const now = new Date();
    if (now.getFullYear() !== year) {
      return null;
    }

    const month = now.getMonth() + 1;
    const semesterStartMonth = semester === 2 ? 8 : 3;
    const semesterEndMonth = semester === 2 ? 11 : 6;

    if (month < semesterStartMonth || month > semesterEndMonth) {
      return null;
    }

    const semesterStart = new Date(year, semesterStartMonth - 1, 1);
    const diffDays = Math.floor((now.getTime() - semesterStart.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    return Math.min(Math.max(week, 1), 16);
  });
  readonly scheduleUnits = computed<ScheduleUnit[]>(() => {
    const unitCards = this.unitCards();
    const classRecords = this.classRecords();

    return unitCards.map((unit) => {
      const weekRange = this.parseWeekRange(unit.period);
      const unitClasses = classRecords
        .filter((planningClass) => planningClass.unitId === unit.id)
        .sort((left, right) => left.plannedDate.localeCompare(right.plannedDate));

      const clases = unitClasses.map((planningClass, index) => ({
        id: planningClass.id,
        titulo: `Clase ${index + 1}`,
        semana: this.resolveScheduleWeek(planningClass.plannedDate, weekRange.startWeek),
        tipo: 'clase' as const
      }));

      const evaluaciones = unitClasses
        .filter((planningClass) => planningClass.evaluationType !== 'SIN_EVALUACION')
        .map((planningClass) => ({
          id: planningClass.id,
          titulo: this.resolveEvaluationLabel(planningClass.evaluationType),
          semana: this.resolveScheduleWeek(planningClass.plannedDate, weekRange.endWeek),
          tipo: 'evaluacion' as const
        }));

      return {
        id: unit.id,
        numero: unit.unitNumber ?? 0,
        nombre: this.stripUnitPrefix(unit.title),
        icono: this.resolveScheduleIcon(unit.tone),
        tone: unit.tone,
        semanaInicio: weekRange.startWeek,
        semanaFin: weekRange.endWeek,
        clases,
        evaluaciones
      };
    });
  });

  readonly activeTab = signal<PlanningTab>('units');
  readonly isLoading = signal(true);
  readonly infoDismissed = signal(false);
  readonly dashboard = signal<PlanningSummary | null>(null);
  readonly classRecords = signal<PlanningClass[]>([]);
  readonly assignments = signal<PlanningUnitCatalogAssignment[]>([]);
  readonly selectedYear = signal<number | null>(null);
  readonly selectedCourseId = signal<number | null>(null);
  readonly selectedSubjectId = signal<number | null>(null);
  readonly selectedSemester = signal<number | null>(1);
  readonly openUnitId = signal<number | null>(null);
  readonly openClassMenuId = signal<number | null>(null);
  readonly pendingUploadClassId = signal<number | null>(null);
  readonly selectedClassPreview = signal<PlanningClass | null>(null);
  readonly selectedPreviewUnit = signal<PlanningUnitCard | null>(null);
  readonly isPreviewLoading = signal(false);

  readonly years = computed<FilterOption<number>[]>(() => {
    const values = Array.from(new Set(this.assignments().map((item) => item.schoolYear))).sort((a, b) => b - a);
    return values.map((value) => ({ value, label: String(value) }));
  });

  readonly courses = computed<FilterOption<number>[]>(() => {
    const year = this.selectedYear();
    const seen = new Map<number, string>();

    for (const assignment of this.assignments()) {
      if (year != null && assignment.schoolYear !== year) {
        continue;
      }
      if (!seen.has(assignment.courseId)) {
        seen.set(assignment.courseId, assignment.courseName);
      }
    }

    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  });

  readonly subjects = computed<FilterOption<number>[]>(() => {
    const year = this.selectedYear();
    const courseId = this.selectedCourseId();
    const seen = new Map<number, string>();

    for (const assignment of this.assignments()) {
      if (year != null && assignment.schoolYear !== year) {
        continue;
      }
      if (courseId != null && assignment.courseId !== courseId) {
        continue;
      }
      if (!seen.has(assignment.subjectId)) {
        seen.set(assignment.subjectId, assignment.subjectName);
      }
    }

    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  });

  readonly hasRequiredFilters = computed(() =>
    this.selectedYear() != null &&
    this.selectedCourseId() != null &&
    this.selectedSubjectId() != null &&
    this.selectedSemester() != null
  );

  readonly hasUnits = computed(() => (this.dashboard()?.units.length ?? 0) > 0);

  readonly averageCoverage = computed(() => this.dashboard()?.summary.semesterProgressPercent ?? 0);

  readonly unitCards = computed<PlanningUnitCard[]>(() => {
    const palette: PlanningUnitCard['tone'][] = ['violet', 'emerald', 'amber', 'blue'];
    return (this.dashboard()?.units ?? []).map((unit, index) => this.mapUnitCard(unit, palette[index % palette.length]));
  });

  readonly summaryItems = computed<SummaryItem[]>(() => {
    const summary = this.dashboard()?.summary;
    const totalClasses = summary?.totalClasses ?? 0;
    const totalUnits = summary?.totalUnits ?? 0;
    const hours = this.unitCards().reduce((acc, unit) => acc + unit.classes, 0);
    return [
      { label: 'Total de clases', value: String(totalClasses), icon: 'calendar_month', tone: 'violet' },
      { label: 'Objetivos de aprendizaje', value: '0', icon: 'fact_check', tone: 'blue' },
      { label: 'Unidades', value: String(totalUnits), icon: 'menu_book', tone: 'amber' },
      { label: 'Horas planificadas', value: `${hours} hrs`, icon: 'schedule', tone: 'emerald' },
      { label: 'Cobertura OA promedio', value: `${this.averageCoverage()}%`, icon: 'donut_small', tone: 'gray' }
    ];
  });

  readonly currentTabLabel = computed(() => {
    return this.tabs.find((tab) => tab.id === this.activeTab())?.label ?? 'Unidades';
  });
  readonly previewObjectives = computed<ClassPreviewObjective[]>(() => {
    const planningClass = this.selectedClassPreview();
    if (!planningClass) {
      return [];
    }

    if (planningClass.curriculumObjectives.length) {
      return planningClass.curriculumObjectives.map((objective) => ({
        code: objective.codigo,
        description: objective.descripcion
      }));
    }

    return planningClass.objectiveCode
      ? [{
        code: planningClass.objectiveCode,
        description: planningClass.objectiveDescription || planningClass.objectiveTitle || 'OA principal de la clase.'
      }]
      : [];
  });
  readonly previewPhases = computed<ClassPreviewPhase[]>(() => {
    const planningClass = this.selectedClassPreview();
    if (!planningClass) {
      return [];
    }

    const totalMinutes = this.estimateClassDurationMinutes(planningClass.durationCode, planningClass.durationLabel);
    const phaseMinutes = this.resolvePhaseMinutes(totalMinutes);

    return [
      {
        title: 'Inicio',
        tone: 'violet',
        description: planningClass.startActivity || 'Sin actividad de inicio registrada.',
        duration: `${phaseMinutes.start} min`
      },
      {
        title: 'Desarrollo',
        tone: 'emerald',
        description: planningClass.developmentActivity || 'Sin actividad de desarrollo registrada.',
        duration: `${phaseMinutes.development} min`
      },
      {
        title: 'Cierre',
        tone: 'amber',
        description: planningClass.closingActivity || 'Sin actividad de cierre registrada.',
        duration: `${phaseMinutes.closing} min`
      }
    ];
  });
  readonly classByClassBoards = computed(() =>
    this.unitCards().map((unit) => ({
      unit,
      cards: unit.classRows.map((classRow) => this.mapClassByClassCard(unit, classRow))
    }))
  );
  readonly classByClassRows = computed(() =>
    this.classByClassBoards().flatMap((board) => board.cards)
  );
  readonly classByClassStats = computed(() => {
    const rows = this.classByClassRows();
    const planned = rows.filter((row) => row.statusTone === 'planned').length;
    const progress = rows.filter((row) => row.statusTone === 'progress').length;
    const completed = rows.filter((row) => row.statusTone === 'completed').length;

    return [
      {
        label: 'clases estimadas',
        value: rows.length,
        icon: 'menu_book',
        tone: 'violet'
      },
      {
        label: 'planificadas',
        value: planned,
        icon: 'check_circle',
        tone: 'emerald'
      },
      {
        label: 'pendientes',
        value: progress,
        icon: 'schedule',
        tone: 'amber'
      },
      {
        label: 'realizadas',
        value: completed,
        icon: 'task_alt',
        tone: 'blue'
      }
    ] as const;
  });

  constructor() {
    this.loadCatalogs();
  }

  setTab(tab: PlanningTab): void {
    this.activeTab.set(tab);
  }

  updateYear(value: string): void {
    this.selectedYear.set(value ? Number(value) : null);
    this.syncFiltersAfterYearChange();
    this.loadSummary();
  }

  updateCourse(value: string): void {
    this.selectedCourseId.set(value ? Number(value) : null);
    this.syncSubjectSelection();
    this.loadSummary();
  }

  updateSubject(value: string): void {
    this.selectedSubjectId.set(value ? Number(value) : null);
    this.loadSummary();
  }

  updateSemester(value: string): void {
    this.selectedSemester.set(value ? Number(value) : null);
    this.loadSummary();
  }

  toggleUnit(unitId: number): void {
    this.openUnitId.update((current) => current === unitId ? null : unitId);
    this.openClassMenuId.set(null);
  }

  isUnitOpen(unitId: number): boolean {
    return this.openUnitId() === unitId;
  }

  dismissInfo(): void {
    this.infoDismissed.set(true);
  }

  openCreateUnit(): void {
    if (!this.hasRequiredFilters()) {
      this.snackBar.open(
        'Debes seleccionar año, curso, asignatura y semestre antes de crear una unidad.',
        'Cerrar',
        { duration: 3800 }
      );
      return;
    }

    this.router.navigate(['/dashboard/planificaciones-nuevo/nueva-unidad'], {
      queryParams: {
        year: this.selectedYear(),
        courseId: this.selectedCourseId(),
        subjectId: this.selectedSubjectId(),
        semester: this.selectedSemester()
      }
    });
  }

  openCreateClass(unit?: PlanningUnitCard): void {
    if (!this.hasRequiredFilters()) {
      this.snackBar.open(
        'Debes seleccionar ano, curso, asignatura y semestre antes de crear una clase.',
        'Cerrar',
        { duration: 3800 }
      );
      return;
    }

    this.router.navigate(['/dashboard/planificaciones-nuevo/nueva-clase'], {
      queryParams: {
        year: this.selectedYear(),
        courseId: this.selectedCourseId(),
        subjectId: this.selectedSubjectId(),
        semester: this.selectedSemester(),
        unitNumber: unit?.unitNumber ?? undefined,
        unitId: unit?.id ?? undefined
      }
    });
  }

  toggleClassMenu(classRow: PlanningUnitClassRow, event: Event): void {
    event.stopPropagation();
    if (classRow.id == null) {
      this.snackBar.open(
        'Esta fila aun no corresponde a una clase guardada. Primero crea la clase desde "Nueva".',
        'Cerrar',
        { duration: 3600 }
      );
      return;
    }

    this.openClassMenuId.update((current) => current === classRow.id ? null : classRow.id);
  }

  isClassMenuOpen(classRow: PlanningUnitClassRow): boolean {
    return classRow.id != null && this.openClassMenuId() === classRow.id;
  }

  closeClassMenu(): void {
    this.openClassMenuId.set(null);
  }

  editClass(classRow: PlanningUnitClassRow, unit: PlanningUnitCard): void {
    this.closeClassMenu();
    if (classRow.id == null) {
      this.snackBar.open('La clase debe estar guardada antes de editarse.', 'Cerrar', {
        duration: 3200
      });
      return;
    }

    this.router.navigate(['/dashboard/planificaciones-nuevo/nueva-clase'], {
      queryParams: {
        year: this.selectedYear(),
        courseId: this.selectedCourseId(),
        subjectId: this.selectedSubjectId(),
        semester: this.selectedSemester(),
        unitNumber: unit.unitNumber ?? undefined,
        unitId: unit.id,
        classId: classRow.id
      }
    });
  }

  viewClass(classRow: PlanningUnitClassRow, unit: PlanningUnitCard): void {
    this.closeClassMenu();
    if (classRow.id == null) {
      this.snackBar.open('La clase debe estar guardada antes de poder visualizarse.', 'Cerrar', {
        duration: 3200
      });
      return;
    }

    const cached = this.classRecords().find((planningClass) => planningClass.id === classRow.id) ?? null;
    this.selectedPreviewUnit.set(unit);
    this.selectedClassPreview.set(cached);
    this.isPreviewLoading.set(true);

    this.planningApiService.getClassById(classRow.id).subscribe({
      next: (planningClass) => {
        this.selectedClassPreview.set(planningClass);
        this.isPreviewLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isPreviewLoading.set(false);
        if (!cached) {
          this.selectedPreviewUnit.set(null);
          this.selectedClassPreview.set(null);
        }
        this.showError(error, 'No fue posible cargar el resumen de la clase');
      }
    });
  }

  closeClassPreview(): void {
    this.selectedPreviewUnit.set(null);
    this.selectedClassPreview.set(null);
    this.isPreviewLoading.set(false);
  }

  editPreviewClass(): void {
    const previewClass = this.selectedClassPreview();
    const previewUnit = this.selectedPreviewUnit();

    if (!previewClass || !previewUnit) {
      return;
    }

    this.closeClassPreview();
    this.editClass({
      id: previewClass.id,
      unitId: previewClass.unitId,
      number: previewClass.id,
      title: previewClass.title,
      objective: previewClass.objectiveDescription || previewClass.objectiveTitle || previewClass.title,
      statusLabel: previewClass.status === 'PUBLICADA' ? 'Publicada' : 'Planificada',
      statusTone: previewClass.status === 'PUBLICADA' ? 'completed' : 'planned',
      documentsCount: previewClass.documents.length
    }, previewUnit);
  }

  deleteClass(classRow: PlanningUnitClassRow): void {
    this.closeClassMenu();
    if (classRow.id == null) {
      this.snackBar.open('Solo se pueden eliminar clases que ya fueron guardadas.', 'Cerrar', {
        duration: 3200
      });
      return;
    }

    const confirmed = window.confirm(`Se eliminara la clase ${classRow.number}. Esta accion no se puede deshacer.`);
    if (!confirmed) {
      return;
    }

    this.planningApiService.deleteClass(classRow.id).subscribe({
      next: () => {
        this.snackBar.open('Clase eliminada correctamente.', 'Cerrar', { duration: 3200 });
        this.loadSummary();
      },
      error: (error: HttpErrorResponse) => {
        this.showError(error, 'No fue posible eliminar la clase');
      }
    });
  }

  createClassFromUnit(unit: PlanningUnitCard, event?: Event): void {
    event?.stopPropagation();
    this.closeClassMenu();
    this.openCreateClass(unit);
  }

  attachResourcesToClass(classRow: PlanningUnitClassRow, input: HTMLInputElement): void {
    this.closeClassMenu();
    if (classRow.id == null) {
      this.snackBar.open('Primero guarda la clase antes de adjuntar recursos.', 'Cerrar', {
        duration: 3400
      });
      return;
    }

    this.pendingUploadClassId.set(classRow.id);
    input.value = '';
    input.click();
  }

  onClassResourceSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const classId = this.pendingUploadClassId();

    if (!file || classId == null) {
      return;
    }

    this.planningApiService.uploadClassDocument(classId, file, false).subscribe({
      next: () => {
        this.pendingUploadClassId.set(null);
        input.value = '';
        this.snackBar.open('Recurso adjuntado correctamente.', 'Cerrar', { duration: 3200 });
        this.loadSummary();
      },
      error: (error: HttpErrorResponse) => {
        this.pendingUploadClassId.set(null);
        input.value = '';
        this.showError(error, 'No fue posible adjuntar el recurso');
      }
    });
  }

  deleteUnit(unit: PlanningUnitCard, event?: Event): void {
    event?.stopPropagation();
    const confirmed = window.confirm(`Se eliminara ${unit.title}. Esta accion no se puede deshacer.`);
    if (!confirmed) {
      return;
    }

    this.planningApiService.deleteUnit(unit.id).subscribe({
      next: () => {
        this.snackBar.open('Unidad eliminada correctamente.', 'Cerrar', { duration: 3200 });
        this.loadSummary();
      },
      error: (error: HttpErrorResponse) => {
        this.showError(error, 'No fue posible eliminar la unidad');
      }
    });
  }

  editUnit(unit: PlanningUnitCard, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/dashboard/planificaciones-nuevo/nueva-unidad'], {
      queryParams: {
        year: this.selectedYear(),
        courseId: this.selectedCourseId(),
        subjectId: this.selectedSubjectId(),
        semester: this.selectedSemester(),
        unitId: unit.id
      }
    });
  }

  trackByLabel(_: number, item: SummaryItem): string {
    return item.label;
  }

  previewStatusLabel(status: PlanningClass['status'] | undefined): string {
    return status === 'PUBLICADA' ? 'Lista para guardar' : 'Borrador';
  }

  previewStatusTone(status: PlanningClass['status'] | undefined): string {
    return status === 'PUBLICADA' ? 'success' : 'warning';
  }

  previewEvaluationLabel(value: PlanningClass['evaluationType'] | undefined): string {
    switch (value) {
      case 'SUMATIVA':
        return 'Sumativa';
      case 'DIAGNOSTICA':
        return 'Diagnostica';
      case 'SIN_EVALUACION':
        return 'Sin evaluacion';
      default:
        return 'Formativa';
    }
  }

  previewInstrumentLabel(planningClass: PlanningClass | null): string {
    if (!planningClass) {
      return 'No definido';
    }

    return planningClass.evaluationType === 'SUMATIVA' ? 'Prueba o pauta' : 'Rubrica';
  }

  previewDateLabel(value: string | undefined): string {
    if (!value) {
      return 'Sin fecha definida';
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return value;
    }

    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  previewDurationLabel(planningClass: PlanningClass | null): string {
    if (!planningClass) {
      return 'Sin duracion definida';
    }

    return `${this.estimateClassDurationMinutes(planningClass.durationCode, planningClass.durationLabel)} minutos`;
  }

  previewResourcesText(planningClass: PlanningClass | null): string {
    if (!planningClass) {
      return 'Sin recursos registrados.';
    }

    if (planningClass.documents.length) {
      return planningClass.documents.map((document) => document.originalName).join(', ');
    }

    return 'Sin recursos adjuntos todavia.';
  }

  scheduleGridColumn(startWeek: number, span = 1): string {
    return `${startWeek} / span ${span}`;
  }

  scheduleUnitBarColumn(unit: ScheduleUnit): string {
    return `${unit.semanaInicio} / ${unit.semanaFin + 1}`;
  }

  scheduleIcon(icon: string): string {
    return icon;
  }

  scheduleTrackByUnit(_: number, unit: ScheduleUnit): number {
    return unit.id;
  }

  scheduleCurrentWeekValue(): number | null {
    return this.currentScheduleWeek();
  }

  previewEvidenceText(planningClass: PlanningClass | null): string {
    if (!planningClass) {
      return 'Sin evidencia registrada.';
    }

    return planningClass.objectiveDescription
      || planningClass.objectiveTitle
      || 'Sin evidencia de aprendizaje registrada.';
  }

  classByClassTrackBy(_: number, item: ClassByClassCard): string {
    return item.id;
  }

  openClassByClassPreview(card: ClassByClassCard, unit: PlanningUnitCard): void {
    if (card.classId == null) {
      this.snackBar.open('La clase debe estar guardada antes de poder visualizarse.', 'Cerrar', {
        duration: 3200
      });
      return;
    }

    this.viewClass({
      id: card.classId,
      unitId: card.unitId,
      number: card.classNumber,
      title: card.title,
      objective: card.objective,
      statusLabel: card.statusLabel,
      statusTone: card.statusTone,
      documentsCount: 0
    }, unit);
  }

  getUnitCardById(unitId: number): PlanningUnitCard | null {
    return this.unitCards().find((unit) => unit.id === unitId) ?? null;
  }

  private loadCatalogs(): void {
    this.isLoading.set(true);
    this.planningApiService.getUnitCatalogs().subscribe({
      next: (catalogs) => {
        this.assignments.set(catalogs.teachingAssignments);
        this.initializeSelections();
        this.loadSummary();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar los filtros de planificaciones');
      }
    });
  }

  private initializeSelections(): void {
    const years = this.years();
    this.selectedYear.set(years[0]?.value ?? null);
    this.syncCourseSelection();
    this.syncSubjectSelection();
    if (this.selectedSemester() == null) {
      this.selectedSemester.set(1);
    }
  }

  private syncFiltersAfterYearChange(): void {
    this.syncCourseSelection();
    this.syncSubjectSelection();
  }

  private syncCourseSelection(): void {
    const currentCourseId = this.selectedCourseId();
    const options = this.courses();
    const exists = options.some((item) => item.value === currentCourseId);
    this.selectedCourseId.set(exists ? currentCourseId : (options[0]?.value ?? null));
  }

  private syncSubjectSelection(): void {
    const currentSubjectId = this.selectedSubjectId();
    const options = this.subjects();
    const exists = options.some((item) => item.value === currentSubjectId);
    this.selectedSubjectId.set(exists ? currentSubjectId : (options[0]?.value ?? null));
  }

  private loadSummary(): void {
    if (!this.hasRequiredFilters()) {
      this.dashboard.set(null);
      this.classRecords.set([]);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    const filters = {
      year: this.selectedYear() ?? undefined,
      courseId: this.selectedCourseId() ?? undefined,
      subjectId: this.selectedSubjectId() ?? undefined,
      semester: this.selectedSemester() ?? undefined
    };

    forkJoin({
      summary: this.planningApiService.getPlanningSummary(filters),
      classes: this.planningApiService.getClasses(filters)
    }).subscribe({
      next: ({ summary, classes }) => {
        this.dashboard.set(summary);
        this.classRecords.set(classes);
        this.openUnitId.set(summary.units[0]?.id ?? null);
        this.openClassMenuId.set(null);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.dashboard.set(null);
        this.classRecords.set([]);
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar las unidades planificadas');
      }
    });
  }

  private mapUnitCard(unit: PlanningSummaryUnit, tone: PlanningUnitCard['tone']): PlanningUnitCard {
    return {
      id: unit.id,
      unitNumber: this.extractFirstNumber(unit.code),
      title: `${unit.code}: ${unit.name}`,
      period: this.resolvePeriodLabel(unit.weekRange),
      description: `Curso ${unit.courseName} · ${unit.subjectName}`,
      classes: unit.plannedClasses,
      resources: unit.totalDocuments,
      coverage: unit.progressPercent,
      tone,
      statusLabel: this.resolveStatusLabel(unit.status),
      classRows: this.buildClassRows(unit)
    };
  }

  private buildClassRows(unit: PlanningSummaryUnit): PlanningUnitClassRow[] {
    const actualClasses = this.classRecords()
      .filter((planningClass) => planningClass.unitId === unit.id)
      .sort((left, right) => left.plannedDate.localeCompare(right.plannedDate));

    if (actualClasses.length) {
      return actualClasses.map((planningClass, index) => ({
        id: planningClass.id,
        unitId: unit.id,
        number: index + 1,
        title: planningClass.title,
        objective: planningClass.objectiveDescription || planningClass.objectiveTitle || planningClass.title,
        statusLabel: planningClass.status === 'PUBLICADA' ? 'Publicada' : 'Planificada',
        statusTone: planningClass.status === 'PUBLICADA' ? 'completed' : 'planned',
        documentsCount: planningClass.documents.length
      }));
    }

    const defaultObjectives = [
      'Leer textos literarios breves y comentar su contenido.',
      'Identificar personajes, ambiente y secuencia de hechos.',
      'Expresar opiniones sobre lo leido con apoyo del docente.',
      'Relacionar lo leido con experiencias y conocimientos previos.'
    ];

    const totalRows = Math.max(3, Math.min(unit.plannedClasses || 0, 4));

    return Array.from({ length: totalRows }, (_, index) => {
      const number = index + 1;
      const isCompleted = unit.status === 'COMPLETADA';
      const isProgressRow = unit.status === 'ACTIVA' && index === Math.min(2, totalRows - 1);

      return {
        id: null,
        unitId: unit.id,
        number,
        title: `Clase ${number}`,
        objective: defaultObjectives[index] ?? `Clase ${number} de la unidad.`,
        statusLabel: isCompleted ? 'Completada' : isProgressRow ? 'En progreso' : 'Planificada',
        statusTone: isCompleted ? 'completed' : isProgressRow ? 'progress' : 'planned',
        documentsCount: 0
      };
    });
  }

  private resolvePeriodLabel(weekRange: string): string {
    return weekRange && weekRange !== '-' ? `Semanas ${weekRange}` : 'Sin rango definido';
  }

  private resolveStatusLabel(status: PlanningSummaryUnit['status']): string {
    switch (status) {
      case 'ACTIVA':
        return 'En progreso';
      case 'COMPLETADA':
        return 'Completada';
      default:
        return 'Pendiente';
    }
  }

  private extractFirstNumber(value: string): number | null {
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  private estimateClassDurationMinutes(code: string, label: string): number {
    const normalizedLabel = label.toLowerCase();
    const normalizedCode = code.toLowerCase();
    const explicitMinutes = label.match(/(\d{2,3})\s*min/i)?.[1];

    if (explicitMinutes) {
      return Number(explicitMinutes);
    }

    if (normalizedCode.includes('dos') || normalizedCode.includes('2') || normalizedLabel.includes('2 bloque')) {
      return 90;
    }

    if (normalizedCode.includes('una_semana') || normalizedLabel.includes('semana')) {
      return 180;
    }

    return 45;
  }

  private resolvePhaseMinutes(totalMinutes: number): { start: number; development: number; closing: number } {
    if (totalMinutes >= 90) {
      return { start: 15, development: totalMinutes - 30, closing: 15 };
    }

    if (totalMinutes >= 60) {
      return { start: 10, development: totalMinutes - 20, closing: 10 };
    }

    return { start: 8, development: Math.max(totalMinutes - 16, 20), closing: 8 };
  }

  private parseWeekRange(period: string): { startWeek: number; endWeek: number } {
    const matches = period.match(/\d+/g)?.map(Number) ?? [];
    if (matches.length >= 2) {
      return {
        startWeek: this.clampScheduleWeek(matches[0]),
        endWeek: this.clampScheduleWeek(matches[1])
      };
    }

    if (matches.length === 1) {
      const startWeek = this.clampScheduleWeek(matches[0]);
      return { startWeek, endWeek: Math.min(startWeek + 3, 16) };
    }

    return { startWeek: 1, endWeek: 4 };
  }

  private resolveScheduleWeek(plannedDate: string, fallbackWeek: number): number {
    if (!plannedDate) {
      return this.clampScheduleWeek(fallbackWeek);
    }

    const [year, month, day] = plannedDate.split('-').map(Number);
    if (!year || !month || !day) {
      return this.clampScheduleWeek(fallbackWeek);
    }

    const semesterStartMonth = this.selectedSemester() === 2 ? 8 : 3;
    const semesterStart = new Date(year, semesterStartMonth - 1, 1);
    const classDate = new Date(year, month - 1, day);
    if (Number.isNaN(classDate.getTime())) {
      return this.clampScheduleWeek(fallbackWeek);
    }

    const diffDays = Math.floor((classDate.getTime() - semesterStart.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    return this.clampScheduleWeek(week || fallbackWeek);
  }

  private resolveEvaluationLabel(type: PlanningClass['evaluationType']): string {
    switch (type) {
      case 'SUMATIVA':
        return 'Eval. sumativa';
      case 'DIAGNOSTICA':
        return 'Eval. diagnostica';
      default:
        return 'Eval. formativa';
    }
  }

  private resolveScheduleIcon(tone: PlanningUnitCard['tone']): string {
    switch (tone) {
      case 'emerald':
        return 'palette';
      case 'amber':
        return 'visibility';
      case 'blue':
        return 'school';
      default:
        return 'menu_book';
    }
  }

  private stripUnitPrefix(title: string): string {
    return title.replace(/^Unidad\s*\d+\s*:\s*/i, '').trim();
  }

  private clampScheduleWeek(week: number): number {
    return Math.min(Math.max(week, 1), 16);
  }

  private mapClassByClassCard(unit: PlanningUnitCard, classRow: PlanningUnitClassRow): ClassByClassCard {
    const planningClass = classRow.id != null
      ? this.classRecords().find((record) => record.id === classRow.id) ?? null
      : null;

    return {
      id: `${unit.id}-${classRow.number}-${classRow.id ?? 'draft'}`,
      classId: classRow.id,
      unitId: unit.id,
      unitTitle: unit.title,
      unitTone: unit.tone,
      classNumber: classRow.number,
      title: planningClass?.title || classRow.title,
      objective: classRow.objective,
      objectiveCode: planningClass?.objectiveCode || `OA${classRow.number}`,
      statusLabel: classRow.statusLabel,
      statusTone: classRow.statusTone,
      durationLabel: planningClass ? this.previewDurationLabel(planningClass) : '45 minutos',
      dateLabel: planningClass ? this.previewDateLabel(planningClass.plannedDate) : 'Fecha por definir',
      resourcesLabel: classRow.documentsCount > 0 ? `${classRow.documentsCount} recurso(s)` : 'Sin recursos',
      unitLabel: unit.unitNumber ? `Unidad ${unit.unitNumber}` : unit.title
    };
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
