import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type PlanningTab = 'units' | 'schedule' | 'class-by-class' | 'evaluations';

type FilterOption = {
  value: string;
  label: string;
};

type UnitClassRow = {
  number: number;
  objective: string;
  status: 'planned' | 'progress' | 'pending';
};

type PlanningUnitCard = {
  id: number;
  title: string;
  period: string;
  description: string;
  classes: number;
  objectives: number;
  coverage: number;
  tone: 'violet' | 'emerald' | 'amber' | 'blue';
  rows: UnitClassRow[];
};

type SummaryItem = {
  label: string;
  value: string;
  icon: string;
  tone: 'violet' | 'blue' | 'amber' | 'emerald';
};

@Component({
  selector: 'app-plannings-home-page',
  standalone: true,
  imports: [
    MatIconModule,
    RouterLink,
    TeacherModernLayoutComponent
  ],
  templateUrl: './plannings-home-page.component.html',
  styleUrl: './plannings-home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningsHomePageComponent {
  private readonly authStateService = inject(AuthStateService);

  readonly user = this.authStateService.user;

  readonly tabs: Array<{ id: PlanningTab; label: string }> = [
    { id: 'units', label: 'Unidades' },
    { id: 'schedule', label: 'Cronograma' },
    { id: 'class-by-class', label: 'Clase a clase' },
    { id: 'evaluations', label: 'Evaluaciones' }
  ];

  readonly courses: FilterOption[] = [
    { value: '3m-a', label: '3° Medio A' },
    { value: '2m-a', label: '2° Medio A' },
    { value: '8b-a', label: '8° Básico A' }
  ];

  readonly subjects: FilterOption[] = [
    { value: 'matematica', label: 'Matemática' },
    { value: 'lenguaje', label: 'Lenguaje y Comunicación' },
    { value: 'historia', label: 'Historia' }
  ];

  readonly semesters: FilterOption[] = [
    { value: '1', label: 'Primer semestre' },
    { value: '2', label: 'Segundo semestre' }
  ];

  readonly years: FilterOption[] = [
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' }
  ];

  readonly activeTab = signal<PlanningTab>('units');
  readonly selectedCourse = signal('3m-a');
  readonly selectedSubject = signal('matematica');
  readonly selectedSemester = signal('1');
  readonly selectedYear = signal('2026');
  readonly openUnitId = signal(1);

  readonly units = signal<PlanningUnitCard[]>([
    {
      id: 1,
      title: 'Unidad 1: Descubrir y disfrutar la lectura',
      period: 'Marzo - Abril',
      description: 'Lectura guiada y comprension de cuentos, poemas y textos breves con foco en vocabulario, oralidad y gusto lector.',
      classes: 12,
      objectives: 18,
      coverage: 62,
      tone: 'violet',
      rows: [
        { number: 1, objective: 'Leer textos literarios breves y comentar su contenido.', status: 'planned' },
        { number: 2, objective: 'Identificar personajes, ambiente y secuencia de hechos.', status: 'planned' },
        { number: 3, objective: 'Expresar opiniones sobre lo leido con apoyo del docente.', status: 'progress' },
        { number: 4, objective: 'Reconocer palabras nuevas en contexto.', status: 'progress' },
        { number: 5, objective: 'Releer para profundizar comprension.', status: 'pending' }
      ]
    },
    {
      id: 2,
      title: 'Unidad 2: Escribir para comunicar ideas',
      period: 'Mayo - Junio',
      description: 'Produccion escrita progresiva a partir de experiencias cercanas, modelos y planificacion simple de textos.',
      classes: 20,
      objectives: 22,
      coverage: 71,
      tone: 'emerald',
      rows: [
        { number: 1, objective: 'Escribir textos breves con inicio, desarrollo y cierre.', status: 'planned' },
        { number: 2, objective: 'Revisar escritura con apoyo de pauta simple.', status: 'progress' },
        { number: 3, objective: 'Usar mayusculas y punto final en producciones guiadas.', status: 'planned' },
        { number: 4, objective: 'Ampliar oraciones incorporando vocabulario nuevo.', status: 'pending' }
      ]
    },
    {
      id: 3,
      title: 'Unidad 3: Hablar y escuchar para aprender',
      period: 'Julio - Agosto',
      description: 'Interacciones orales para relatar, describir, preguntar y participar en conversaciones con propositos claros.',
      classes: 16,
      objectives: 20,
      coverage: 68,
      tone: 'amber',
      rows: [
        { number: 1, objective: 'Relatar experiencias respetando secuencia temporal.', status: 'planned' },
        { number: 2, objective: 'Escuchar instrucciones y responder preguntas pertinentes.', status: 'pending' },
        { number: 3, objective: 'Participar en dramatizaciones y lecturas expresivas.', status: 'pending' }
      ]
    },
  ]);

  readonly totalClasses = computed(() =>
    this.units().reduce((acc, unit) => acc + unit.classes, 0)
  );

  readonly totalObjectives = computed(() =>
    this.units().reduce((acc, unit) => acc + unit.objectives, 0)
  );

  readonly averageCoverage = computed(() => {
    const units = this.units();
    if (!units.length) {
      return 0;
    }
    const totalCoverage = units.reduce((acc, unit) => acc + unit.coverage, 0);
    return Math.round(totalCoverage / units.length);
  });

  readonly summaryItems = computed<SummaryItem[]>(() => [
    { label: 'Total de clases', value: '89', icon: 'calendar_month', tone: 'violet' },
    { label: 'Objetivos de aprendizaje', value: '108', icon: 'fact_check', tone: 'blue' },
    { label: 'Unidades', value: '6', icon: 'menu_book', tone: 'amber' },
    { label: 'Cobertura OA promedio', value: '69%', icon: 'insights', tone: 'emerald' }
  ]);

  readonly currentTabLabel = computed(() => {
    return this.tabs.find((tab) => tab.id === this.activeTab())?.label ?? 'Unidades';
  });

  readonly selectedCourseLabel = computed(() => this.findLabel(this.courses, this.selectedCourse()));
  readonly selectedSubjectLabel = computed(() => this.findLabel(this.subjects, this.selectedSubject()));
  readonly selectedSemesterLabel = computed(() => this.findLabel(this.semesters, this.selectedSemester()));
  readonly selectedYearLabel = computed(() => this.findLabel(this.years, this.selectedYear()));

  setTab(tab: PlanningTab): void {
    this.activeTab.set(tab);
  }

  setCourse(value: string): void {
    this.selectedCourse.set(value);
  }

  setSubject(value: string): void {
    this.selectedSubject.set(value);
  }

  setSemester(value: string): void {
    this.selectedSemester.set(value);
  }

  setYear(value: string): void {
    this.selectedYear.set(value);
  }

  toggleUnit(unitId: number): void {
    this.openUnitId.update((current) => current === unitId ? -1 : unitId);
  }

  isUnitOpen(unitId: number): boolean {
    return this.openUnitId() === unitId;
  }

  statusLabel(status: UnitClassRow['status']): string {
    switch (status) {
      case 'planned':
        return 'Planificada';
      case 'progress':
        return 'En progreso';
      default:
        return 'Sin planificar';
    }
  }

  private findLabel(options: FilterOption[], value: string): string {
    return options.find((option) => option.value === value)?.label ?? '';
  }
}
