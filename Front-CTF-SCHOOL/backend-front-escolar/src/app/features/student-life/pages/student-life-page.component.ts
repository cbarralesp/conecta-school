import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { StudentLifeApiService } from '../../../core/services/student-life-api.service';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { GradeApiService } from '../../../core/services/grade-api.service';
import { TeacherApiService } from '../../../core/services/teacher-api.service';
import { AttendanceStudentSummary, DailyAttendanceStudent, DailyAttendanceView, MonthlyAttendanceStudent, MonthlyAttendanceStudentDay, MonthlyAttendanceView } from '../../../core/models/attendance.models';
import { EnrollmentDetail, EnrollmentDocument } from '../../../core/models/enrollment.models';
import { GradeBookView, StudentGradeCard } from '../../../core/models/grade.models';
import { TeacherListItem } from '../../../core/models/teacher.models';
import {
  CreateStudentLifeInterviewPayload,
  CreateStudentLifeRecordPayload,
  StudentLifeInterview,
  StudentLifeRecord,
  StudentLifeAlert,
  StudentLifeListItem,
  StudentLifeOverview,
  StudentLifeStatus,
  StudentLifeSummary
} from '../../../core/models/student-life.models';
import { SummaryMetricCardComponent } from '../../../shared/summary-metric-card.component';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type EstadoHojaVida = StudentLifeStatus;
type AlertaHojaVida = StudentLifeAlert;
type LifeTab = 'Resumen' | 'Convivencia' | 'Asistencia' | 'Evaluaciones' | 'Entrevista' | 'Documentos';
type CategoriaConvivencia = 'Todos' | 'Positivas' | 'Negativas' | 'Entrevistas' | 'Acuerdos';
type TipoNuevaAnotacion = 'Positiva' | 'Negativa' | 'Entrevista' | 'Acuerdo';

interface EstudianteHojaVida extends StudentLifeListItem {}

interface RegistroConvivencia {
  id: number;
  fecha: string;
  hora: string;
  titulo: string;
  responsable: string;
  detalle: string;
  tipo: 'Positiva' | 'Negativa' | 'Entrevista' | 'Acuerdo activo' | 'Derivacion';
  categoria: CategoriaConvivencia;
  icon: string;
}

interface AccionProxima {
  id: number;
  targetTab: LifeTab;
  attendanceKind?: AccionAsistencia['kind'];
  titulo: string;
  fecha: string;
  detalle: string;
  icon: string;
  tone: 'blue' | 'amber' | 'purple';
}

interface DocumentoEstudiante {
  id: number;
  documentKey?: string;
  enrollmentId?: number;
  documentId?: number | null;
  nombre: string;
  tipo: 'PDF' | 'DOCX' | 'IMG';
  fecha: string;
  estado: 'Vigente' | 'Pendiente' | 'Vencido';
  icon: string;
}

interface EnrollmentDocumentSlot {
  key: string;
  title: string;
  description: string;
}

interface AlertaSalud {
  id: number;
  titulo: string;
  detalle: string;
  icon: string;
  tone: 'red' | 'amber' | 'blue' | 'green';
}

interface ActualizacionDocumento {
  id: number;
  titulo: string;
  detalle: string;
  fecha: string;
  icon: string;
  tone: 'red' | 'blue' | 'green';
}

interface EvaluacionEstudiante {
  id: number;
  asignatura: string;
  notas: string;
  promedio: string;
  nivel: 'Adecuado' | 'En progreso' | 'Por mejorar';
}

interface PromedioAsignatura {
  asignatura: string;
  promedio: string;
  porcentaje: number;
}

interface ProximaEvaluacion {
  id: number;
  fecha: string;
  asignatura: string;
  detalle: string;
  tone: 'blue' | 'amber' | 'purple';
}

interface RegistroAsistencia {
  id: number;
  fecha: string;
  jornada: string;
  estado: 'Presente' | 'Atraso' | 'Ausente' | 'Justificado';
  hora: string;
  detalle: string;
}

interface TendenciaAsistencia {
  mes: string;
  porcentaje: number;
  label: string;
}

interface AccionAsistencia {
  id: number;
  kind: 'absences' | 'lates' | 'withdrawals' | 'ok';
  titulo: string;
  fecha: string;
  detalle: string;
  icon: string;
  tone: 'blue' | 'amber' | 'purple';
}

interface DiaCalendarioAsistencia {
  dia: number | null;
  estado: 'Presente' | 'Atraso' | 'Ausente' | 'Justificado' | 'Feriado' | 'Vacio';
  etiqueta?: string;
}

interface EntrevistaEstudiante {
  id: number;
  fecha: string;
  hora: string;
  tipo: 'Apoderado' | 'Estudiante' | 'Equipo';
  participantes: string[];
  motivo: string;
  responsable: string;
  rol: string;
  estado: 'Realizada' | 'Programada' | 'Pendiente';
}

interface InterviewForm {
  studentName: string;
  guardianName: string;
  course: string;
  date: string;
  time: string;
  teacher: string;
  interviewType: EntrevistaEstudiante['tipo'];
  reason: string;
  summary: string;
  agreements: string;
}

interface AnnotationForm {
  type: Extract<TipoNuevaAnotacion, 'Positiva' | 'Negativa' | 'Acuerdo'>;
  date: string;
  time: string;
  category: string;
  area: string;
  responsible: string;
  status: string;
  deadline: string;
  description: string;
}

interface OpcionNuevaAnotacion {
  tipo: TipoNuevaAnotacion;
  titulo: string;
  etiqueta: string;
  descripcion: string;
  icon: string;
  tone: 'green' | 'red' | 'blue' | 'amber';
}

@Component({
  selector: 'app-student-life-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,
    SummaryMetricCardComponent,
    TeacherModernLayoutComponent
  ],
  templateUrl: './student-life-page.component.html',
  styleUrl: './student-life-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentLifePageComponent {
  private static readonly PAGE_SIZE = 10;
  private static readonly SCHOOL_YEARS = [2025, 2026, 2027, 2028] as const;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly authStateService = inject(AuthStateService);
  private readonly studentLifeApiService = inject(StudentLifeApiService);
  private readonly attendanceApiService = inject(AttendanceApiService);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  private readonly gradeApiService = inject(GradeApiService);
  private readonly teacherApiService = inject(TeacherApiService);

  protected readonly user = this.authStateService.user;
  protected readonly selectedYear = signal(2026);
  protected readonly selectedCourse = signal('');
  protected readonly selectedStatus = signal('Todos');
  protected readonly searchTerm = signal('');
  protected readonly currentPage = signal(1);
  protected readonly selectedMenuId = signal<number | null>(null);
  protected readonly selectedLifeTab = signal<LifeTab>('Resumen');
  protected readonly selectedRecordFilter = signal<CategoriaConvivencia>('Todos');
  protected readonly selectedAttendanceAction = signal<AccionAsistencia['kind'] | null>(null);
  protected readonly annotationDialogOpen = signal(false);
  protected readonly selectedAnnotationType = signal<AnnotationForm['type'] | null>(null);
  protected readonly interviewDialogOpen = signal(false);
  protected readonly interviewDialogMode = signal<'create' | 'view' | 'edit'>('create');
  protected readonly overview = signal<StudentLifeOverview | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isLoadingStudentSummary = signal(false);
  protected readonly selectedEnrollmentDetail = signal<EnrollmentDetail | null>(null);
  protected readonly selectedAttendanceSummary = signal<AttendanceStudentSummary | null>(null);
  protected readonly selectedMonthlyAttendance = signal<MonthlyAttendanceView | null>(null);
  protected readonly selectedDailyAttendance = signal<DailyAttendanceView | null>(null);
  protected readonly selectedAttendanceMonth = signal(this.currentMonthValue());
  protected readonly selectedGradeSummary = signal<StudentGradeCard | null>(null);
  protected readonly selectedGradeBooks = signal<GradeBookView[]>([]);
  protected readonly studentInterviews = signal<EntrevistaEstudiante[] | null>(null);
  protected readonly teacherOptions = signal<TeacherListItem[]>([]);
  protected readonly schoolYears = StudentLifePageComponent.SCHOOL_YEARS;
  protected readonly pageSize = StudentLifePageComponent.PAGE_SIZE;
  private editingInterviewId: number | null = null;
  private editingRecordId: number | null = null;
  private dashboardActionHandled = false;

  protected interviewForm: InterviewForm = {
    studentName: '',
    guardianName: '',
    course: '',
    date: '',
    time: '',
    teacher: '',
    interviewType: 'Apoderado',
    reason: '',
    summary: '',
    agreements: ''
  };

  protected annotationForm: AnnotationForm = this.createAnnotationForm('Positiva');

  protected readonly resumenModulo = computed<StudentLifeSummary>(() => this.overview()?.summary ?? {
    totalEstudiantes: 0,
    conHojaActiva: 0,
    enSeguimiento: 0,
    conAlertas: 0,
    entrevistasPendientes: 0,
    documentosPorRevisar: 0
  });

  protected readonly lifeTabs: { label: LifeTab; icon: string }[] = [
    { label: 'Resumen', icon: 'dashboard_customize' },
    { label: 'Convivencia', icon: 'verified_user' },
    { label: 'Asistencia', icon: 'alarm' },
    { label: 'Evaluaciones', icon: 'event_note' },
    { label: 'Entrevista', icon: 'forum' },
    { label: 'Documentos', icon: 'description' }
  ];

  protected readonly recordFilters: { label: CategoriaConvivencia; icon: string }[] = [
    { label: 'Todos', icon: 'view_list' },
    { label: 'Positivas', icon: 'thumb_up' },
    { label: 'Negativas', icon: 'thumb_down' },
    { label: 'Entrevistas', icon: 'group' },
    { label: 'Acuerdos', icon: 'volunteer_activism' }
  ];

  protected readonly annotationOptions: OpcionNuevaAnotacion[] = [
    {
      tipo: 'Positiva',
      titulo: 'Anotacion positiva',
      etiqueta: 'Reconocimiento',
      descripcion: 'Registra una conducta destacada, logro o aporte positivo del estudiante.',
      icon: 'thumb_up',
      tone: 'green'
    },
    {
      tipo: 'Negativa',
      titulo: 'Anotacion negativa',
      etiqueta: 'Seguimiento',
      descripcion: 'Deja constancia de una situación conductual que requiere acompanamiento.',
      icon: 'thumb_down',
      tone: 'red'
    },
    {
      tipo: 'Entrevista',
      titulo: 'Entrevista',
      etiqueta: 'Apoderado',
      descripcion: 'Agenda o registra una reunión con apoderado, docente o equipo de apoyo.',
      icon: 'group',
      tone: 'blue'
    },
    {
      tipo: 'Acuerdo',
      titulo: 'Acuerdo de convivencia',
      etiqueta: 'Compromiso',
      descripcion: 'Crea compromisos, responsables y acciones de seguimiento para el caso.',
      icon: 'volunteer_activism',
      tone: 'amber'
    }
  ];

  protected readonly registrosConvivencia = signal<RegistroConvivencia[]>([]);

  private readonly enrollmentDocumentSections = [
    {
      key: 'identity',
      title: 'Identidad',
      documents: [
        { key: 'birth-certificate', title: 'Certificado de nacimiento', description: 'Copia reciente o digitalizada.' },
        { key: 'student-id', title: 'Cedula de identidad del alumno', description: 'Ambos lados, vigente.' },
        { key: 'guardian-id', title: 'Cedula del apoderado', description: 'Documento de identidad del apoderado principal.' },
        { key: 'legal-custody', title: 'Tutela o resolucion judicial', description: 'Solo si existe tutela legal o condicion especial.' }
      ]
    },
    {
      key: 'academic',
      title: 'Academico',
      documents: [
        { key: 'study-certificate', title: 'Certificado de estudios', description: 'Documento del año anterior o último curso aprobado.' },
        { key: 'behavior-report', title: 'Informe de personalidad o conducta', description: 'Emitido por el establecimiento anterior, si aplica.' },
        { key: 'report-card', title: 'Boletín de notas', description: 'Apoya la asignación de curso.' },
        { key: 'pie-certificate', title: 'Certificado PIE o NEE', description: 'Diagnostico de necesidades educativas especiales.' }
      ]
    },
    {
      key: 'medical',
      title: 'Medicos',
      documents: [
        { key: 'vaccination-card', title: 'Carne de vacunacion', description: 'Registro de vacunas del estudiante.' },
        { key: 'health-record', title: 'Ficha de salud escolar', description: 'Antecedentes medicos relevantes.' },
        { key: 'medical-report', title: 'Informe medico o diagnostico', description: 'Alergias, tratamientos o condicion cronica.' },
        { key: 'medical-authorization', title: 'Autorización de atención médica', description: 'Permiso para actuar ante emergencias.' }
      ]
    },
    {
      key: 'other',
      title: 'Otros',
      documents: [
        { key: 'contract', title: 'Contrato', description: 'Documento contractual de matricula, si corresponde.' },
        { key: 'commitment-letter', title: 'Carta compromiso', description: 'Acuerdos o compromisos firmados por el apoderado.' },
        { key: 'image-consent', title: 'Consentimiento imagenes', description: 'Autorizacion para uso de imagenes en actividades o material institucional.' },
        { key: 'interview', title: 'Entrevista', description: 'Registro de entrevista de admision, convivencia o seguimiento.' },
        { key: 'simple-power', title: 'Poder simple', description: 'Autorizacion simple para representacion o tramites especificos.' },
        { key: 'payment-receipt', title: 'Boleta', description: 'Comprobante de pago o respaldo administrativo.' },
        { key: 'other', title: 'Otros', description: 'Cualquier otro documento complementario de la matrícula.' }
      ]
    }
  ] as const;

  protected get entrevistasEstudiante(): EntrevistaEstudiante[] {
    return this.studentInterviews() ?? [];
  }

  protected readonly estudiantes = computed<EstudianteHojaVida[]>(() =>
    this.overview()?.students ?? []
  );

  protected readonly courseOptions = computed(() => this.overview()?.courses ?? []);

  protected readonly pagination = computed(() => this.overview()?.pagination ?? {
    page: 0,
    size: this.pageSize,
    totalItems: this.filteredStudents().length,
    totalPages: this.filteredStudents().length > 0 ? 1 : 0
  });

  protected readonly totalItems = computed(() => this.pagination().totalItems);

  protected readonly pageStart = computed(() => {
    const total = this.totalItems();
    if (total === 0) {
      return 0;
    }
    return ((this.currentPage() - 1) * this.pageSize) + 1;
  });

  protected readonly pageEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.totalItems())
  );

  constructor() {
    this.loadOverview();
    this.loadTeacherOptions();
    if (this.route.snapshot.paramMap.has('id')) {
      this.loadSelectedStudentSummary();
    }
  }

  protected readonly selectedStudent = computed<EstudianteHojaVida | null>(() => {
    const detail = this.selectedEnrollmentDetail();
    if (detail) {
      return this.mapEnrollmentDetailToStudent(detail);
    }

    const id = Number(this.route.snapshot.paramMap.get('id') ?? 1);
    return this.estudiantes().find((estudiante) => estudiante.id === id) ?? this.estudiantes()[0] ?? null;
  });

  protected readonly selectedDocumentsCount = computed(() =>
    this.selectedEnrollmentDetail()?.documents.length ?? 0
  );

  protected readonly interviewGuardianOptions = computed(() => {
    const detail = this.selectedEnrollmentDetail();
    const fallbackGuardian = this.selectedStudent()?.apoderado ?? '';
    const options = [
      fallbackGuardian,
      this.familyContactName(detail?.guardian?.name, detail?.guardian?.lastName),
      this.familyContactName(detail?.father?.name, detail?.father?.lastName),
      this.familyContactName(detail?.mother?.name, detail?.mother?.lastName)
    ].filter((option): option is string => !!option && this.isLikelyPersonName(option));

    return [...new Set(options)];
  });

  protected readonly interviewTeacherOptions = computed(() => {
    const teachers = this.teacherOptions()
      .filter((teacher) => teacher.active !== false)
      .map((teacher) => teacher.fullName)
      .filter(Boolean);
    const currentUser = this.user()?.nombre ?? '';
    return [...new Set([currentUser, ...teachers].filter(Boolean))];
  });

  protected readonly selectedAttendanceLabel = computed(() => {
    const summary = this.selectedAttendanceSummary();
    return summary ? `${Math.round(summary.percentage ?? 0)}%` : '-';
  });

  protected readonly selectedAttendanceDetail = computed(() => {
    const summary = this.selectedAttendanceSummary();
    if (!summary) {
      return 'Sin asistencia conectada';
    }
    return `${summary.absentCount ?? 0} inasistencias · ${summary.lateCount ?? 0} atrasos`;
  });

  protected readonly selectedGradeLabel = computed(() => {
    const average = this.selectedGradeSummary()?.overallAverage;
    return average == null ? '-' : average.toFixed(1);
  });

  protected readonly selectedGradeDetail = computed(() => {
    const summary = this.selectedGradeSummary();
    if (!summary) {
      return 'Sin calificaciónes conectadas';
    }
    return `${summary.subjects.length} asignaturas registradas`;
  });

  protected readonly selectedDocumentsDetail = computed(() => {
    const count = this.selectedDocumentsCount();
    return count === 1 ? '1 documento cargado' : `${count} documentos cargados`;
  });

  protected readonly documentosEstudiante = computed<DocumentoEstudiante[]>(() => {
    const detail = this.selectedEnrollmentDetail();
    if (!detail) {
      return [];
    }

    const documentsByKey = new Map(detail.documents.map((document) => [document.documentKey, document]));
    let catalogIndex = 0;
    const catalogRows = this.enrollmentDocumentSections.flatMap((section) =>
      section.documents.map((slot) => {
        const document = this.documentForEnrollmentSlot(slot.key, documentsByKey);
        return this.mapEnrollmentDocumentSlot(slot, document, detail.id, catalogIndex++);
      })
    );
    const catalogKeys = new Set(this.enrollmentDocumentSections.flatMap((section) =>
      section.documents.flatMap((slot) => [slot.key, ...this.legacyDocumentAliases(slot.key)])
    ));
    const extraRows = detail.documents
      .filter((document) => !catalogKeys.has(document.documentKey))
      .map((document, index) => this.mapEnrollmentDocument(document, detail.id, catalogRows.length + index));

    return [...catalogRows, ...extraRows];
  });

  protected readonly documentCompletion = computed(() => {
    const documents = this.documentosEstudiante();
    const total = documents.length;
    const completed = documents.filter((document) => document.estado === 'Vigente').length;
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });

  protected readonly documentStatusSummary = computed(() => {
    const documents = this.documentosEstudiante();
    return {
      vigentes: documents.filter((document) => document.estado === 'Vigente').length,
      pendientes: documents.filter((document) => document.estado === 'Pendiente').length,
      vencidos: documents.filter((document) => document.estado === 'Vencido').length,
      cargados: documents.filter((document) => !!document.documentId).length
    };
  });

  protected readonly documentosPendientes = computed<DocumentoEstudiante[]>(() =>
    this.documentosEstudiante()
      .filter((document) => document.estado !== 'Vigente')
      .slice(0, 4)
  );

  protected readonly actualizacionesDocumentos = computed<ActualizacionDocumento[]>(() => {
    const documents = this.documentosEstudiante().filter((document) => !!document.documentId);
    if (documents.length === 0) {
      return [];
    }

    return documents.slice(0, 5).map((document, index) => ({
      id: document.id,
      titulo: document.nombre,
      detalle: document.estado === 'Pendiente' ? 'Pendiente de revision' : 'Documento cargado',
      fecha: document.fecha,
      icon: document.icon,
      tone: index % 3 === 0 ? 'blue' : document.estado === 'Vencido' ? 'red' : 'green'
    }));
  });

  protected readonly selectedMonthlyStudent = computed<MonthlyAttendanceStudent | null>(() => {
    const detail = this.selectedEnrollmentDetail();
    const monthly = this.selectedMonthlyAttendance();
    if (!detail || !monthly) {
      return null;
    }
    return monthly.students.find((student) => student.studentId === detail.studentId) ?? null;
  });

  protected readonly selectedDailyStudent = computed<DailyAttendanceStudent | null>(() => {
    const detail = this.selectedEnrollmentDetail();
    const daily = this.selectedDailyAttendance();
    if (!detail || !daily) {
      return null;
    }
    return daily.students.find((student) => student.studentId === detail.studentId) ?? null;
  });

  protected readonly registrosAsistencia = computed<RegistroAsistencia[]>(() => {
    const student = this.selectedMonthlyStudent();
    if (!student) {
      return [];
    }

    const days = this.attendanceDaysWithDailyRecord(student.days);

    return days
      .filter((day) => this.isMarkedAttendanceStatus(day.status))
      .map((day, index) => this.mapAttendanceHistoryDay(day, index))
      .reverse()
      .slice(0, 5);
  });

  protected readonly calendarioAsistencia = computed<DiaCalendarioAsistencia[]>(() => {
    const monthly = this.selectedMonthlyAttendance();
    const student = this.selectedMonthlyStudent();
    if (!monthly || !student) {
      return [];
    }

    return this.buildAttendanceCalendar(monthly, student);
  });

  protected readonly tendenciaAsistencia = computed<TendenciaAsistencia[]>(() => {
    const monthly = this.selectedMonthlyAttendance();
    const student = this.selectedMonthlyStudent();
    if (!monthly || !student) {
      return [];
    }

    const percentage = Math.round(student.presentPercentage ?? this.selectedAttendanceSummary()?.percentage ?? 0);
    return [
      {
        mes: monthly.monthLabel || this.monthLabelFromValue(this.selectedAttendanceMonth()),
        porcentaje: percentage,
        label: `${percentage}%`
      }
    ];
  });

  protected readonly accionesAsistencia = computed<AccionAsistencia[]>(() => {
    const summary = this.selectedAttendanceSummary();
    const attendanceDetails = this.attendanceActionDetails();
    if (!summary && attendanceDetails.length === 0) {
      return [];
    }

    const actions: AccionAsistencia[] = [];
    const absences = attendanceDetails.filter((detail) => detail.kind === 'absences').length || (summary?.absentCount ?? 0);
    const lates = attendanceDetails.filter((detail) => detail.kind === 'lates').length || (summary?.lateCount ?? 0);
    const withdrawals = attendanceDetails.filter((detail) => detail.kind === 'withdrawals').length;

    if (absences > 0) {
      actions.push({
        id: 1,
        kind: 'absences',
        titulo: 'Revisar inasistencias',
        fecha: this.monthLabelFromValue(this.selectedAttendanceMonth()),
        detalle: `${absences} inasistencia(s) registradas en el periodo.`,
        icon: 'assignment_late',
        tone: 'amber'
      });
    }
    if (lates > 0) {
      actions.push({
        id: 2,
        kind: 'lates',
        titulo: 'Seguimiento de atrasos',
        fecha: this.monthLabelFromValue(this.selectedAttendanceMonth()),
        detalle: `${lates} atraso(s) acumulados.`,
        icon: 'schedule',
        tone: 'blue'
      });
    }
    if (withdrawals > 0) {
      actions.push({
        id: 3,
        kind: 'withdrawals',
        titulo: 'Retiros registrados',
        fecha: this.monthLabelFromValue(this.selectedAttendanceMonth()),
        detalle: `${withdrawals} retiro(s) registrados en el periodo.`,
        icon: 'logout',
        tone: 'purple'
      });
    }

    return actions.length > 0 ? actions : [{
      id: 1,
      kind: 'ok',
      titulo: 'Asistencia al día',
      fecha: this.monthLabelFromValue(this.selectedAttendanceMonth()),
      detalle: 'Sin acciones pendientes para el periodo.',
      icon: 'task_alt',
      tone: 'purple'
    }];
  });

  protected readonly attendanceActionDetails = computed(() => {
    const student = this.selectedMonthlyStudent();
    if (!student) {
      return [];
    }

    return this.attendanceDaysWithDailyRecord(student.days)
      .filter((day) =>
        this.normalizeAttendanceStatus(day.status) === 'AUSENTE'
        || this.normalizeAttendanceStatus(day.status) === 'ATRASADO'
        || !!day.departureTime
      )
      .map((day, index) => {
        const normalized = this.normalizeAttendanceStatus(day.status);
        const kind: AccionAsistencia['kind'] = day.departureTime
          ? 'withdrawals'
          : normalized === 'AUSENTE'
            ? 'absences'
            : 'lates';
        return {
          id: index + 1,
          kind,
          fecha: this.formatAttendanceDate(day.date),
          registro: day.departureTime ? `Retiro ${day.departureTime}` : this.attendanceStatusRegister(day),
          detalle: this.attendanceStatusDetail(day)
        };
      })
      .reverse();
  });

  protected readonly selectedAttendanceActionDetails = computed(() => {
    const selected = this.selectedAttendanceAction();
    if (!selected || selected === 'ok') {
      return [];
    }
    return this.attendanceActionDetails().filter((detail) => detail.kind === selected).slice(0, 5);
  });

  protected readonly selectedJustifiedCount = computed(() =>
    this.selectedMonthlyStudent()?.days.filter((day) => this.normalizeAttendanceStatus(day.status) === 'JUSTIFICADO').length ?? 0
  );

  protected readonly selectedAttendanceMonthLabel = computed(() =>
    this.selectedMonthlyAttendance()?.monthLabel || this.monthLabelFromValue(this.selectedAttendanceMonth())
  );

  protected readonly selectedAttendanceJornada = computed(() => {
    const schedule = this.selectedEnrollmentDetail()?.courseScheduleType?.trim();
    return schedule ? this.formatScheduleType(schedule) : 'Jornada escolar';
  });

  protected readonly evaluacionesEstudiante = computed<EvaluacionEstudiante[]>(() => {
    const detail = this.selectedEnrollmentDetail();
    const books = this.selectedGradeBooks();
    if (!detail || books.length === 0) {
      return [];
    }

    const rows = books
      .map((book, index) => {
        const row = book.students.find((student) => student.studentId === detail.studentId);
        if (!row) {
          return null;
        }

        const notes = row.scores
          .filter((score) => score.score != null)
          .map((score) => this.formatGradeValue(score.score));

        return {
          id: book.subjectId || index + 1,
          asignatura: book.subjectName,
          notas: notes.join(', '),
          promedio: row.average == null ? '-' : this.formatGradeValue(row.average),
          nivel: this.gradeLevel(row.average)
        } satisfies EvaluacionEstudiante;
      })
      .filter((item): item is EvaluacionEstudiante => item != null);

    return rows;
  });

  protected readonly promediosAsignatura = computed<PromedioAsignatura[]>(() => {
    const summary = this.selectedGradeSummary();
    if (!summary) {
      return [];
    }

    return summary.subjects.map((subject) => ({
      asignatura: subject.subjectName,
      promedio: subject.average == null ? '-' : this.formatGradeValue(subject.average),
      porcentaje: subject.average == null ? 0 : Math.max(0, Math.min(100, Math.round((subject.average / 7) * 100)))
    }));
  });

  protected readonly annotationAreaOptions = computed(() => {
    const subjects = [
      ...(this.selectedGradeSummary()?.subjects.map((subject) => subject.subjectName) ?? []),
      ...this.selectedGradeBooks().map((book) => book.subjectName)
    ];
    const uniqueSubjects = Array.from(new Set(subjects.map((subject) => subject.trim()).filter(Boolean)));
    return ['General', ...uniqueSubjects];
  });

  protected readonly proximasEvaluaciones = computed<ProximaEvaluacion[]>(() => {
    const books = this.selectedGradeBooks();
    if (books.length === 0) {
      return [];
    }

    const today = new Date();
    const upcoming = books.flatMap((book) =>
      book.evaluations
        .filter((evaluation) => !!evaluation.evaluationDate && new Date(`${evaluation.evaluationDate}T00:00:00`) >= today)
        .map((evaluation) => ({
          id: evaluation.id,
          fecha: this.formatShortDate(evaluation.evaluationDate ?? ''),
          asignatura: book.subjectName,
          detalle: evaluation.name,
          tone: 'blue' as const
        }))
    );

    return upcoming.slice(0, 3);
  });

  protected readonly selectedPendingGradesCount = computed(() => {
    const detail = this.selectedEnrollmentDetail();
    if (!detail) {
      return 0;
    }

    return this.selectedGradeBooks().reduce((count, book) => {
      const row = book.students.find((student) => student.studentId === detail.studentId);
      if (!row) {
        return count;
      }
      return count + row.scores.filter((score) => score.score == null && score.conceptCode == null).length;
    }, 0);
  });

  protected readonly noteColumns = computed(() => {
    const maxNotes = Math.max(
      0,
      ...this.evaluacionesEstudiante().map((evaluacion) => this.noteValues(evaluacion).length)
    );

    return Array.from({ length: maxNotes }, (_, index) => `N${index + 1}`);
  });

  protected readonly isDetailView = computed(() => this.route.snapshot.paramMap.has('id'));

  protected readonly filteredRecords = computed(() => {
    const filter = this.selectedRecordFilter();
    return filter === 'Todos'
      ? this.registrosConvivencia()
      : this.registrosConvivencia().filter((registro) => registro.categoria === filter);
  });

  protected readonly summaryIndicators = computed(() => {
    const student = this.selectedStudent();
    return {
      estado: student?.estado ?? '-',
      promedio: this.selectedGradeLabel(),
      atrasos: this.selectedAttendanceSummary()?.lateCount ?? 0,
      alertas: student?.alertas.length ?? 0
    };
  });

  protected readonly pendingSummaryActions = computed<AccionProxima[]>(() => {
    const documentActions = this.documentosPendientes().slice(0, 2).map((document, index) => ({
      id: index + 1,
      targetTab: 'Documentos' as LifeTab,
      titulo: document.nombre,
      fecha: document.estado,
      detalle: document.fecha,
      icon: document.estado === 'Vencido' ? 'assignment_late' : 'description',
      tone: document.estado === 'Vencido' ? 'purple' as const : 'amber' as const
    }));
    const attendanceActions = this.accionesAsistencia().slice(0, Math.max(0, 2 - documentActions.length));
    return [
      ...documentActions,
      ...attendanceActions.map((action, index) => ({
        id: documentActions.length + index + 1,
        targetTab: 'Asistencia' as LifeTab,
        attendanceKind: action.kind,
        titulo: action.titulo,
        fecha: action.fecha,
        detalle: action.detalle,
        icon: action.icon,
        tone: action.tone
      }))
    ];
  });

  protected readonly convivenciaSummary = computed(() => {
    const records = this.registrosConvivencia();
    return {
      positivas: records.filter((record) => record.categoria === 'Positivas').length,
      negativas: records.filter((record) => record.categoria === 'Negativas').length,
      entrevistas: this.entrevistasEstudiante.length,
      acuerdos: records.filter((record) => record.categoria === 'Acuerdos').length
    };
  });

  protected readonly interviewSummary = computed(() => {
    const interviews = this.entrevistasEstudiante;
    return {
      realizadas: interviews.filter((interview) => interview.estado === 'Realizada').length,
      programadas: interviews.filter((interview) => interview.estado === 'Programada').length,
      pendientes: interviews.filter((interview) => interview.estado === 'Pendiente').length
    };
  });

  protected readonly nextInterview = computed(() =>
    this.entrevistasEstudiante.find((interview) => interview.estado === 'Programada' || interview.estado === 'Pendiente') ?? null
  );

  protected readonly filteredStudents = computed(() => {
    const term = this.normalize(this.searchTerm());
    const status = this.selectedStatus();

    return this.estudiantes().filter((estudiante) => {
      const matchesStatus = status === 'Todos'
        || (status === 'Activos' ? estudiante.estado === 'Activo' : estudiante.estado === status);
      const haystack = this.normalize(
        `${estudiante.nombre} ${estudiante.run} ${estudiante.curso} ${estudiante.apoderado} ${estudiante.estado}`
      );
      const matchesTerm = !term || haystack.includes(term);
      return matchesStatus && matchesTerm;
    });
  });

  protected updateYear(value: number | string): void {
    this.selectedYear.set(Number(value));
    this.filtrarEstudiantes();
  }

  protected updateCourse(value: string): void {
    this.selectedCourse.set(value);
    this.filtrarEstudiantes();
  }

  protected updateStatus(value: string): void {
    this.selectedStatus.set(value);
    this.filtrarEstudiantes();
  }

  protected updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.filtrarEstudiantes();
  }

  protected verHojaVida(estudiante: EstudianteHojaVida): void {
    void this.router.navigate(['/dashboard/hoja-vida', estudiante.id]);
  }

  protected volverListado(): void {
    void this.router.navigate(['/dashboard/hoja-vida']);
  }

  protected updateLifeTab(tab: LifeTab): void {
    this.selectedLifeTab.set(tab);
    if (tab === 'Entrevista') {
      this.selectedRecordFilter.set('Entrevistas');
      return;
    }

    if (tab === 'Convivencia') {
      this.selectedRecordFilter.set('Todos');
    }
  }

  protected updateRecordFilter(filter: CategoriaConvivencia): void {
    this.selectedRecordFilter.set(filter);
  }

  protected goToSummaryIndicator(tab: LifeTab): void {
    this.updateLifeTab(tab);
  }

  protected ejecutarAccionPendiente(accion: AccionProxima): void {
    this.updateLifeTab(accion.targetTab);
    if (accion.targetTab === 'Asistencia' && accion.attendanceKind && accion.attendanceKind !== 'ok') {
      this.selectedAttendanceAction.set(accion.attendanceKind);
    }
  }

  protected irADocumentoPendiente(documento: DocumentoEstudiante): void {
    this.updateLifeTab('Documentos');
    if (documento.estado !== 'Vigente') {
      this.subirDocumento(documento);
    }
  }

  protected verProximaEntrevista(entrevista: EntrevistaEstudiante): void {
    this.updateLifeTab('Entrevista');
    this.verEntrevista(entrevista);
  }

  protected openAnnotationDialog(): void {
    this.editingRecordId = null;
    this.selectedAnnotationType.set(null);
    this.annotationDialogOpen.set(true);
  }

  protected closeAnnotationDialog(): void {
    this.annotationDialogOpen.set(false);
    this.selectedAnnotationType.set(null);
  }

  protected selectAnnotationType(option: OpcionNuevaAnotacion): void {
    if (option.tipo === 'Positiva' || option.tipo === 'Negativa' || option.tipo === 'Acuerdo') {
      this.editingRecordId = null;
      this.annotationForm = this.createAnnotationForm(option.tipo);
      this.selectedAnnotationType.set(option.tipo);
      return;
    }
    if (option.tipo === 'Entrevista') {
      this.annotationDialogOpen.set(false);
      this.selectedAnnotationType.set(null);
      this.updateLifeTab('Entrevista');
      this.nuevaEntrevista();
      return;
    }
    this.annotationDialogOpen.set(false);
    this.snackBar.open(`${option.titulo} seleccionado`, 'Cerrar', { duration: 2400 });
  }

  protected backToAnnotationTypes(): void {
    this.selectedAnnotationType.set(null);
  }

  protected saveAnnotationForm(): void {
    const detail = this.selectedEnrollmentDetail();
    if (!detail) {
      this.snackBar.open('Selecciona un estudiante para guardar el registro', 'Cerrar', { duration: 2600 });
      return;
    }

    const payload = this.buildRecordPayload(detail);
    const request = this.editingRecordId
      ? this.studentLifeApiService.updateRecord(this.editingRecordId, payload)
      : this.studentLifeApiService.createRecord(payload);

    request.subscribe({
      next: (record) => {
        const mapped = this.mapApiRecord(record);
        this.registrosConvivencia.update((items) => {
          const exists = items.some((item) => item.id === mapped.id);
          return exists
            ? items.map((item) => item.id === mapped.id ? mapped : item)
            : [mapped, ...items];
        });
        this.editingRecordId = null;
        this.annotationDialogOpen.set(false);
        this.selectedAnnotationType.set(null);
        this.snackBar.open(`${mapped.tipo === 'Acuerdo activo' ? 'Acuerdo de convivencia' : mapped.tipo === 'Positiva' ? 'Anotacion positiva' : 'Anotacion negativa'} guardada`, 'Cerrar', { duration: 2600 });
      },
      error: () => {
        this.snackBar.open('No fue posible guardar el registro de convivencia', 'Cerrar', { duration: 3000 });
      }
    });
  }

  protected verRegistroConvivencia(registro: RegistroConvivencia): void {
    this.openRegistroConvivencia(registro);
  }

  protected editarRegistroConvivencia(registro: RegistroConvivencia): void {
    this.openRegistroConvivencia(registro);
  }

  protected eliminarRegistroConvivencia(registro: RegistroConvivencia): void {
    this.studentLifeApiService.deleteRecord(registro.id).subscribe({
      next: () => {
        this.registrosConvivencia.update((items) => items.filter((item) => item.id !== registro.id));
        this.snackBar.open('Registro eliminado', 'Cerrar', { duration: 2200 });
      },
      error: () => this.snackBar.open('No fue posible eliminar el registro', 'Cerrar', { duration: 2600 })
    });
  }

  protected editarEstudiante(estudiante: EstudianteHojaVida): void {
    this.snackBar.open(`Editar registro de ${estudiante.nombre}`, 'Cerrar', { duration: 2400 });
  }

  protected abrirMenuAcciones(estudiante: EstudianteHojaVida): void {
    this.selectedMenuId.update((current) => current === estudiante.id ? null : estudiante.id);
  }

  protected filtrarEstudiantes(): void {
    this.currentPage.set(1);
    this.loadOverview();
  }

  protected cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > Math.max(this.pagination().totalPages, 1)) {
      return;
    }
    this.currentPage.set(pagina);
    this.loadOverview();
  }

  protected nuevoRegistro(): void {
    this.snackBar.open('Nuevo registro de hoja de vida', 'Cerrar', { duration: 2400 });
  }

  protected exportar(): void {
    this.snackBar.open('Exportacion de hoja de vida disponible proximamente', 'Cerrar', { duration: 2400 });
  }

  protected ejecutarAccionHojaVida(): void {
    this.snackBar.open('Acciones de hoja de vida disponibles desde el modulo', 'Cerrar', { duration: 2400 });
  }

  protected subirDocumento(documento?: DocumentoEstudiante): void {
    const detail = this.selectedEnrollmentDetail();
    const documentKey = documento?.documentKey?.trim();
    if (!detail?.id || !documentKey) {
      this.snackBar.open('Selecciona un documento del expediente para cargar el archivo', 'Cerrar', { duration: 2600 });
      return;
    }

    const documentName = documento?.nombre ?? 'documento';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp';
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      if (!file) {
        return;
      }
      this.uploadEnrollmentDocumentFromLife(detail.id, documentKey, file, documentName);
    };
    input.click();
  }

  protected verDocumento(documento: DocumentoEstudiante): void {
    if (documento.enrollmentId && documento.documentId) {
      window.open(this.enrollmentApiService.documentPreviewUrl(documento.enrollmentId, documento.documentId), '_blank');
      return;
    }
    this.snackBar.open(`Ver ${documento.nombre}`, 'Cerrar', { duration: 2200 });
  }

  protected descargarDocumento(documento: DocumentoEstudiante): void {
    if (documento.enrollmentId && documento.documentId) {
      this.enrollmentApiService.downloadDocumentBlob(documento.enrollmentId, documento.documentId).subscribe({
        next: (blob) => this.downloadBlob(blob, documento.nombre),
        error: () => this.snackBar.open('No fue posible descargar el documento', 'Cerrar', { duration: 2600 })
      });
      return;
    }
    this.snackBar.open(`Descargando ${documento.nombre}`, 'Cerrar', { duration: 2200 });
  }

  protected abrirDocumentosMatricula(documento?: DocumentoEstudiante): void {
    const enrollmentId = documento?.enrollmentId ?? this.selectedEnrollmentDetail()?.id;
    if (!enrollmentId) {
      this.snackBar.open('No hay matricula asociada para abrir documentos', 'Cerrar', { duration: 2400 });
      return;
    }
    void this.router.navigate(['/dashboard/matriculas', enrollmentId]);
  }

  protected cambiarMesAsistencia(dirección: 'anterior' | 'siguiente'): void {
    this.selectedAttendanceMonth.set(this.shiftMonth(this.selectedAttendanceMonth(), dirección === 'anterior' ? -1 : 1));
    this.selectedAttendanceAction.set(null);
    this.loadSelectedMonthlyAttendance();
  }

  protected toggleAttendanceAction(action: AccionAsistencia): void {
    if (action.kind === 'ok') {
      this.selectedAttendanceAction.set(null);
      return;
    }
    this.selectedAttendanceAction.update((current) => current === action.kind ? null : action.kind);
  }

  protected verEntrevista(entrevista: EntrevistaEstudiante): void {
    this.openInterviewFromApi(entrevista.id, 'view');
  }

  protected editarEntrevista(entrevista: EntrevistaEstudiante): void {
    this.openInterviewFromApi(entrevista.id, 'edit');
  }

  protected descargarEntrevistaPdf(entrevista: EntrevistaEstudiante): void {
    this.studentLifeApiService.downloadInterviewPdf(entrevista.id).subscribe({
      next: (blob) => this.downloadBlob(blob, `acta-entrevista-${entrevista.fecha.replace(/\//g, '-')}.pdf`),
      error: () => this.snackBar.open('No fue posible descargar el acta', 'Cerrar', { duration: 2800 })
    });
  }

  protected eliminarEntrevista(entrevista: EntrevistaEstudiante): void {
    this.studentLifeApiService.deleteInterview(entrevista.id).subscribe({
      next: () => {
        this.studentInterviews.update((current) => (current ?? []).filter((item) => item.id !== entrevista.id));
        this.snackBar.open('Entrevista eliminada correctamente', 'Cerrar', { duration: 2400 });
      },
      error: () => this.snackBar.open('No fue posible eliminar la entrevista', 'Cerrar', { duration: 2800 })
    });
  }

  protected nuevaEntrevista(): void {
    this.editingInterviewId = null;
    this.interviewDialogMode.set('create');
    this.interviewForm = this.createInterviewForm();
    this.interviewDialogOpen.set(true);
  }

  protected closeInterviewDialog(): void {
    this.interviewDialogOpen.set(false);
    this.editingInterviewId = null;
  }

  protected saveInterviewForm(): void {
    if (this.interviewDialogMode() === 'view') {
      return;
    }

    const detail = this.selectedEnrollmentDetail();
    if (!detail) {
      this.snackBar.open('No fue posible identificar al estudiante', 'Cerrar', { duration: 2600 });
      return;
    }

    const payload = this.buildInterviewPayload(detail);
    const request = this.editingInterviewId
      ? this.studentLifeApiService.updateInterview(this.editingInterviewId, payload)
      : this.studentLifeApiService.createInterview(payload);

    request.subscribe({
      next: (interview) => {
        const mapped = this.mapApiInterview(interview);
        this.studentInterviews.update((current) => {
          const rows = current ?? [];
          return this.editingInterviewId
            ? rows.map((item) => item.id === mapped.id ? mapped : item)
            : [mapped, ...rows];
        });
        this.interviewDialogOpen.set(false);
        this.editingInterviewId = null;
        this.snackBar.open(
          this.interviewDialogMode() === 'edit' ? 'Entrevista actualizada correctamente' : 'Entrevista guardada correctamente',
          'Cerrar',
          { duration: 2400 }
        );
      },
      error: () => {
        this.snackBar.open('No fue posible guardar la entrevista', 'Cerrar', { duration: 2800 });
      }
    });
  }

  protected interviewDialogTitle(): string {
    if (this.interviewDialogMode() === 'view') {
      return 'Acta formal de entrevista escolar';
    }
    if (this.interviewDialogMode() === 'edit') {
      return 'Edicion de entrevista escolar';
    }
    return 'Registro formal de entrevista escolar';
  }

  protected participantNames(entrevista: EntrevistaEstudiante): string[] {
    const roles = ['Apoderado', 'Estudiante', 'Equipo'];
    const mainParticipant = entrevista.participantes
      .filter((participante) => !roles.includes(participante))
      .map((participante) => this.firstNameAndSurname(participante))[0]
      ?? this.firstNameAndSurname(this.selectedStudent()?.apoderado ?? '');

    return mainParticipant ? [mainParticipant] : [];
  }

  private firstNameAndSurname(name: string): string {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length <= 2) {
      return parts.join(' ');
    }
    return `${parts[0]} ${parts[parts.length - 2]}`;
  }

  protected interviewStatusSummary(): string {
    const interviews = this.entrevistasEstudiante;
    const realizadas = interviews.filter((interview) => interview.estado === 'Realizada').length;
    const programadas = interviews.filter((interview) => interview.estado === 'Programada').length;
    const pendientes = interviews.filter((interview) => interview.estado === 'Pendiente').length;
    return `${realizadas} realizadas, ${programadas} programadas y ${pendientes} pendientes`;
  }

  protected initials(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  protected noteValues(evaluacion: EvaluacionEstudiante): string[] {
    return evaluacion.notas
      .split(',')
      .map((nota) => nota.trim())
      .filter(Boolean);
  }

  protected alertLabel(alerta: AlertaHojaVida): string {
    return alerta === 'Vision' ? 'Vision' : alerta;
  }

  private createInterviewForm(): InterviewForm {
    const student = this.selectedStudent();
    return {
      studentName: student?.nombre ?? '',
      guardianName: this.interviewGuardianOptions()[0] ?? student?.apoderado ?? '',
      course: student?.curso ?? '',
      date: this.todayInputValue(),
      time: this.currentTimeValue(),
      teacher: this.interviewTeacherOptions()[0] ?? this.user()?.nombre ?? '',
      interviewType: 'Apoderado',
      reason: '',
      summary: '',
      agreements: ''
    };
  }

  private createAnnotationForm(type: AnnotationForm['type']): AnnotationForm {
    return {
      type,
      date: this.todayInputValue(),
      time: this.currentTimeValue(),
      category: type === 'Positiva'
        ? 'Esfuerzo y dedicacion'
        : type === 'Acuerdo'
          ? 'Compromiso conductual'
          : 'Conducta disruptiva',
      area: 'General',
      responsible: type === 'Acuerdo' ? 'Estudiante' : '',
      status: type === 'Acuerdo' ? 'Activo' : '',
      deadline: type === 'Acuerdo' ? '15 dias' : '',
      description: type === 'Positiva'
        ? 'Demuestra gran esfuerzo y perseverancia en sus tareas diarias.'
        : type === 'Acuerdo'
          ? 'Se establecen compromisos y acciones de seguimiento para mejorar la convivencia.'
          : 'Se registra situación que requiere acompanamiento y seguimiento.'
    };
  }

  private openRegistroConvivencia(registro: RegistroConvivencia): void {
    if (registro.categoria === 'Entrevistas') {
      this.annotationDialogOpen.set(false);
      this.selectedAnnotationType.set(null);
      this.updateLifeTab('Entrevista');
      this.interviewForm = {
        ...this.createInterviewForm(),
        date: this.todayInputValue(),
        time: registro.hora || this.currentTimeValue(),
        reason: registro.titulo,
        summary: registro.detalle
      };
      this.interviewDialogMode.set('edit');
      this.interviewDialogOpen.set(true);
      return;
    }

    const type: AnnotationForm['type'] = registro.categoria === 'Positivas'
      ? 'Positiva'
      : registro.categoria === 'Negativas'
        ? 'Negativa'
        : 'Acuerdo';

    this.studentLifeApiService.getRecord(registro.id).pipe(
      catchError(() => of(null))
    ).subscribe((record) => {
      this.editingRecordId = registro.id;
      this.annotationForm = record
        ? this.recordToAnnotationForm(record)
        : {
            ...this.createAnnotationForm(type),
            date: this.inputDateFromDisplayDate(registro.fecha) || this.todayInputValue(),
            time: registro.hora || this.currentTimeValue(),
            category: registro.titulo,
            description: registro.detalle
          };
      this.selectedAnnotationType.set(this.annotationForm.type);
      this.annotationDialogOpen.set(true);
    });
  }

  private loadOverview(): void {
    this.isLoading.set(true);
    this.studentLifeApiService.getOverview({
      schoolYear: this.selectedYear(),
      search: this.searchTerm(),
      courseId: this.selectedCourseId(),
      status: this.selectedStatusFilter(),
      page: Math.max(this.currentPage() - 1, 0),
      size: this.pageSize
    }).subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.overview.set(null);
        this.isLoading.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'No fue posible cargar la hoja de vida de estudiantes',
          'Cerrar',
          { duration: 3500 }
        );
      }
    });
  }

  private loadTeacherOptions(): void {
    this.teacherApiService.getOverview({ status: 'ACTIVO' }).pipe(
      catchError(() => of(null))
    ).subscribe((overview) => {
      this.teacherOptions.set(overview?.teachers ?? []);
    });
  }

  private selectedCourseId(): number | null {
    const value = this.selectedCourse().trim();
    if (!value) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private selectedStatusFilter(): string | null {
    const status = this.selectedStatus();
    if (status === 'Activos') {
      return 'ACTIVO';
    }
    if (status === 'Seguimiento') {
      return 'PENDIENTE';
    }
    return null;
  }

  private loadSelectedStudentSummary(): void {
    const enrollmentId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(enrollmentId) || enrollmentId <= 0) {
      return;
    }

    this.isLoadingStudentSummary.set(true);
    this.enrollmentApiService.getById(enrollmentId).subscribe({
      next: (detail) => {
        this.selectedEnrollmentDetail.set(detail);
        this.registrosConvivencia.set([]);
        this.loadSelectedInterviews(detail.studentId);
        this.loadSelectedRecords(detail.studentId);
        this.applyDashboardAction();
        const schoolYear = detail.courseSchoolYear ?? this.selectedYear();
        const semester = this.currentSemester();

        forkJoin({
          attendance: this.attendanceApiService
            .getStudentSummary(detail.courseId, detail.studentId, schoolYear, semester)
            .pipe(catchError(() => of(null))),
          monthlyAttendance: this.attendanceApiService
            .getMonthly(detail.courseId, this.selectedAttendanceMonth())
            .pipe(catchError(() => of(null))),
          dailyAttendance: this.attendanceApiService
            .getDaily(detail.courseId, this.todayInputValue())
            .pipe(catchError(() => of(null))),
          gradeCatalog: this.gradeApiService.getCatalog().pipe(catchError(() => of(null)))
        }).subscribe(({ attendance, monthlyAttendance, dailyAttendance, gradeCatalog }) => {
          this.selectedAttendanceSummary.set(attendance);
          this.selectedMonthlyAttendance.set(monthlyAttendance);
          this.selectedDailyAttendance.set(dailyAttendance);
          const period = gradeCatalog?.periods.find((item) =>
            item.schoolYear === schoolYear && item.semester === semester
          ) ?? gradeCatalog?.periods.find((item) => item.schoolYear === schoolYear) ?? null;

          if (!period) {
            this.selectedGradeSummary.set(null);
            this.selectedGradeBooks.set([]);
            this.isLoadingStudentSummary.set(false);
            return;
          }

          this.gradeApiService.getStudentProfile(detail.courseId, period.id).pipe(
            catchError(() => of(null))
          ).subscribe((profile) => {
            const studentSummary = profile?.students.find((student) => student.studentId === detail.studentId) ?? null;
            this.selectedGradeSummary.set(studentSummary);

            const subjects = studentSummary?.subjects ?? [];
            if (subjects.length === 0) {
              this.selectedGradeBooks.set([]);
              this.isLoadingStudentSummary.set(false);
              return;
            }

            forkJoin(
              subjects.map((subject) =>
                this.gradeApiService.getGradeBook(detail.courseId, period.id, subject.subjectId).pipe(
                  catchError(() => of(null))
                )
              )
            ).subscribe((books) => {
              this.selectedGradeBooks.set(books.filter((book): book is GradeBookView => book != null));
              this.isLoadingStudentSummary.set(false);
            });
          });
        });
      },
      error: () => {
        this.selectedEnrollmentDetail.set(null);
        this.selectedAttendanceSummary.set(null);
        this.selectedDailyAttendance.set(null);
        this.selectedGradeSummary.set(null);
        this.selectedGradeBooks.set([]);
        this.studentInterviews.set(null);
        this.registrosConvivencia.set([]);
        this.isLoadingStudentSummary.set(false);
        this.snackBar.open('No fue posible cargar el resumen del estudiante', 'Cerrar', { duration: 3200 });
      }
    });
  }

  private loadSelectedInterviews(studentId: number): void {
    this.studentLifeApiService.getInterviews(studentId).pipe(
      catchError(() => of([]))
    ).subscribe((interviews) => {
      this.studentInterviews.set(interviews.map((interview) => this.mapApiInterview(interview)));
    });
  }

  private uploadEnrollmentDocumentFromLife(
    enrollmentId: number,
    documentKey: string,
    file: File,
    documentName: string
  ): void {
    if (file.size > 20 * 1024 * 1024) {
      this.snackBar.open('El archivo supera el limite de 20 MB', 'Cerrar', { duration: 2600 });
      return;
    }

    this.snackBar.open(`Cargando ${documentName}...`, 'Cerrar', { duration: 1600 });
    this.enrollmentApiService.uploadDocument(enrollmentId, documentKey, file).subscribe({
      next: () => {
        this.refreshSelectedEnrollmentDetail(enrollmentId);
        this.snackBar.open('Documento cargado en expediente de matricula', 'Cerrar', { duration: 2600 });
      },
      error: (error: HttpErrorResponse) => {
        const message = error.error?.message || error.error?.error || 'No fue posible cargar el documento';
        this.snackBar.open(message, 'Cerrar', { duration: 3200 });
      }
    });
  }

  private refreshSelectedEnrollmentDetail(enrollmentId: number): void {
    this.enrollmentApiService.getById(enrollmentId).subscribe({
      next: (detail) => this.selectedEnrollmentDetail.set(detail),
      error: () => this.snackBar.open('Documento cargado, pero no fue posible refrescar la ficha', 'Cerrar', { duration: 3000 })
    });
  }

  private applyDashboardAction(): void {
    if (this.dashboardActionHandled) {
      return;
    }

    const tab = this.route.snapshot.queryParamMap.get('tab');
    const allowedTabs = new Set<LifeTab>(['Resumen', 'Convivencia', 'Asistencia', 'Evaluaciones', 'Entrevista', 'Documentos']);
    if (tab && allowedTabs.has(tab as LifeTab)) {
      this.dashboardActionHandled = true;
      this.updateLifeTab(tab as LifeTab);
    }
  }

  private loadSelectedRecords(studentId: number): void {
    this.studentLifeApiService.getRecords(studentId).pipe(
      catchError(() => of([]))
    ).subscribe((records) => {
      this.registrosConvivencia.set(records.map((record) => this.mapApiRecord(record)));
    });
  }

  private mapApiRecord(record: StudentLifeRecord): RegistroConvivencia {
    const isAgreement = record.type === 'Acuerdo';
    const isNegative = record.type === 'Negativa';
    return {
      id: record.id,
      fecha: this.formatIsoDate(record.date),
      hora: record.time ?? '',
      titulo: record.category,
      responsable: record.responsible || this.user()?.nombre || 'Registro institucional',
      detalle: record.description,
      tipo: isAgreement ? 'Acuerdo activo' : isNegative ? 'Negativa' : 'Positiva',
      categoria: isAgreement ? 'Acuerdos' : isNegative ? 'Negativas' : 'Positivas',
      icon: isAgreement ? 'volunteer_activism' : isNegative ? 'thumb_down' : 'thumb_up'
    };
  }

  private mapApiInterview(interview: StudentLifeInterview): EntrevistaEstudiante {
    return {
      id: interview.id,
      fecha: this.formatIsoDate(interview.date),
      hora: interview.time ?? '',
      tipo: interview.type,
      participantes: interview.participants,
      motivo: interview.reason,
      responsable: interview.responsible,
      rol: interview.responsibleRole,
      estado: interview.status
    };
  }

  private openInterviewFromApi(interviewId: number, mode: 'view' | 'edit'): void {
    this.studentLifeApiService.getInterview(interviewId).subscribe({
      next: (interview) => {
        this.populateInterviewForm(interview);
        this.editingInterviewId = mode === 'edit' ? interview.id : null;
        this.interviewDialogMode.set(mode);
        this.interviewDialogOpen.set(true);
      },
      error: () => {
        const interview = this.entrevistasEstudiante.find((item) => item.id === interviewId);
        if (!interview) {
          this.snackBar.open('No fue posible cargar la entrevista', 'Cerrar', { duration: 2800 });
          return;
        }
        this.populateInterviewFormFromRow(interview);
        this.editingInterviewId = mode === 'edit' ? interview.id : null;
        this.interviewDialogMode.set(mode);
        this.interviewDialogOpen.set(true);
        this.snackBar.open('Entrevista abierta con datos disponibles en pantalla', 'Cerrar', { duration: 2400 });
      }
    });
  }

  private populateInterviewForm(interview: StudentLifeInterview): void {
    const student = this.selectedStudent();
    this.interviewForm = {
      studentName: student?.nombre ?? '',
      guardianName: interview.participants[0] ?? this.interviewGuardianOptions()[0] ?? student?.apoderado ?? '',
      course: student?.curso ?? '',
      date: interview.date,
      time: interview.time ?? this.currentTimeValue(),
      teacher: interview.responsible || this.interviewTeacherOptions()[0] || this.user()?.nombre || '',
      interviewType: interview.type,
      reason: interview.reason,
      summary: interview.summary,
      agreements: interview.agreements
    };
  }

  private populateInterviewFormFromRow(interview: EntrevistaEstudiante): void {
    const student = this.selectedStudent();
    this.interviewForm = {
      studentName: student?.nombre ?? '',
      guardianName: interview.participantes[0] ?? this.interviewGuardianOptions()[0] ?? student?.apoderado ?? '',
      course: student?.curso ?? '',
      date: this.inputDateFromDisplayDate(interview.fecha) || this.todayInputValue(),
      time: interview.hora || this.currentTimeValue(),
      teacher: interview.responsable || this.interviewTeacherOptions()[0] || this.user()?.nombre || '',
      interviewType: interview.tipo,
      reason: interview.motivo,
      summary: '',
      agreements: ''
    };
  }

  private buildInterviewPayload(detail: EnrollmentDetail): CreateStudentLifeInterviewPayload {
    return {
      studentId: detail.studentId,
      enrollmentId: detail.id,
      date: this.interviewForm.date,
      time: this.interviewForm.time || this.currentTimeValue(),
      type: this.interviewForm.interviewType,
      participants: this.interviewParticipants(),
      reason: this.interviewForm.reason,
      responsible: this.interviewForm.teacher,
      responsibleRole: this.user()?.rol ?? '',
      status: 'Realizada',
      summary: this.interviewForm.summary,
      agreements: this.interviewForm.agreements
    };
  }

  private buildRecordPayload(detail: EnrollmentDetail): CreateStudentLifeRecordPayload {
    return {
      studentId: detail.studentId,
      enrollmentId: detail.id,
      date: this.annotationForm.date || this.todayInputValue(),
      time: this.annotationForm.time || this.currentTimeValue(),
      type: this.annotationForm.type,
      category: this.annotationForm.category,
      area: this.annotationForm.area,
      responsible: this.annotationForm.responsible || this.user()?.nombre || '',
      status: this.annotationForm.status || (this.annotationForm.type === 'Acuerdo' ? 'Activo' : 'Registrada'),
      deadline: this.annotationForm.deadline,
      description: this.annotationForm.description
    };
  }

  private recordToAnnotationForm(record: StudentLifeRecord): AnnotationForm {
    return {
      type: record.type,
      date: record.date || this.todayInputValue(),
      time: record.time ?? this.currentTimeValue(),
      category: record.category,
      area: record.area || 'General',
      responsible: record.responsible || '',
      status: record.status || (record.type === 'Acuerdo' ? 'Activo' : ''),
      deadline: record.deadline || (record.type === 'Acuerdo' ? '15 dias' : ''),
      description: record.description || ''
    };
  }

  private interviewParticipants(): string[] {
    const participants = [this.interviewForm.guardianName];
    if (this.interviewForm.interviewType === 'Estudiante') {
      participants.push(this.interviewForm.studentName);
    }
    if (this.interviewForm.interviewType === 'Equipo') {
      participants.push(this.interviewForm.teacher);
    }
    return [...new Set(participants.filter((participant) => participant.trim()))];
  }

  private formatIsoDate(value: string): string {
    if (!value) {
      return '';
    }
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  }

  private inputDateFromDisplayDate(value: string): string {
    if (!value) {
      return '';
    }
    const [day, month, year] = value.split('/');
    return day && month && year ? `${year}-${month}-${day}` : value;
  }

  private mapEnrollmentDetailToStudent(detail: EnrollmentDetail): EstudianteHojaVida {
    return {
      id: detail.id,
      studentId: detail.studentId,
      nombre: `${detail.studentName} ${detail.studentLastName}`.trim(),
      run: detail.studentRun,
      curso: detail.courseName,
      courseId: detail.courseId,
      courseSchoolYear: detail.courseSchoolYear,
      apoderado: `${detail.guardian.name} ${detail.guardian.lastName}`.trim(),
      estado: detail.status.trim().toUpperCase().startsWith('ACT') ? 'Activo' : 'Seguimiento',
      alertas: [
        ...(detail.allergies ? ['Alergia' as const] : []),
        ...((detail.specialNeeds || detail.specialistDiagnoses) ? ['PIE' as const] : [])
      ],
      avatarTone: 'blue'
    };
  }

  private currentSemester(): number {
    return new Date().getMonth() + 1 >= 8 ? 2 : 1;
  }

  private loadSelectedMonthlyAttendance(): void {
    const detail = this.selectedEnrollmentDetail();
    if (!detail) {
      return;
    }

    forkJoin({
      monthly: this.attendanceApiService.getMonthly(detail.courseId, this.selectedAttendanceMonth()).pipe(
        catchError(() => of(null))
      ),
      daily: this.isCurrentAttendanceMonth()
        ? this.attendanceApiService.getDaily(detail.courseId, this.todayInputValue()).pipe(catchError(() => of(null)))
        : of(null)
    }).subscribe(({ monthly, daily }) => {
      this.selectedMonthlyAttendance.set(monthly);
      this.selectedDailyAttendance.set(daily);
    });
  }

  private buildAttendanceCalendar(
    monthly: MonthlyAttendanceView,
    student: MonthlyAttendanceStudent
  ): DiaCalendarioAsistencia[] {
    const [year, month] = this.selectedAttendanceMonth().split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const totalDays = new Date(year, month, 0).getDate();
    const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
    const attendanceDays = this.attendanceDaysWithDailyRecord(student.days);
    const statusByDate = new Map(attendanceDays.map((day) => [day.date, day.status]));
    const specialByDate = new Map(monthly.specialDates.map((special) => [special.date, special.label]));
    const calendar: DiaCalendarioAsistencia[] = Array.from({ length: leadingEmptyDays }, () => ({
      dia: null,
      estado: 'Vacio'
    }));

    for (let day = 1; day <= totalDays; day++) {
      const date = `${year}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;
      const specialLabel = specialByDate.get(date);
      const baseStatus = statusByDate.get(date);
      const enrichedDay = this.enrichedAttendanceDay({ date, status: baseStatus ?? '' });
      calendar.push({
        dia: day,
        estado: specialLabel ? 'Feriado' : this.mapCalendarAttendanceStatus(enrichedDay.status),
        etiqueta: specialLabel || this.calendarStatusLabel(enrichedDay)
      });
    }

    return calendar;
  }

  private isMarkedAttendanceStatus(status: string): boolean {
    return ['PRESENTE', 'ATRASADO', 'AUSENTE', 'JUSTIFICADO'].includes(this.normalizeAttendanceStatus(status));
  }

  private attendanceDaysWithDailyRecord(days: MonthlyAttendanceStudentDay[]): MonthlyAttendanceStudentDay[] {
    const dailyStudent = this.selectedDailyStudent();
    if (!dailyStudent || !this.isCurrentAttendanceMonth()) {
      return days;
    }

    const today = this.todayInputValue();
    const dailyDay: MonthlyAttendanceStudentDay = {
      date: today,
      status: dailyStudent.status,
      departureTime: dailyStudent.departureTime,
      departureReason: dailyStudent.departureReason,
      departureJustified: dailyStudent.departureJustified,
      departureNote: dailyStudent.departureNote
    };
    const existingIndex = days.findIndex((day) => day.date === today);
    if (existingIndex === -1) {
      return [...days, dailyDay];
    }

    return days.map((day, index) => index === existingIndex ? { ...day, ...dailyDay } : day);
  }

  private mapAttendanceHistoryDay(day: MonthlyAttendanceStudentDay, index: number): RegistroAsistencia {
    const enrichedDay = this.enrichedAttendanceDay(day);
    return {
      id: index + 1,
      fecha: this.formatAttendanceDate(enrichedDay.date),
      jornada: this.selectedAttendanceJornada(),
      estado: this.mapAttendanceStatus(enrichedDay.status),
      hora: this.attendanceStatusRegister(enrichedDay),
      detalle: this.attendanceStatusDetail(enrichedDay)
    };
  }

  private enrichedAttendanceDay(day: MonthlyAttendanceStudentDay): MonthlyAttendanceStudentDay {
    const dailyStudent = this.selectedDailyStudent();
    if (!dailyStudent || day.date !== this.todayInputValue()) {
      return day;
    }

    return {
      ...day,
      status: dailyStudent.status || day.status,
      departureTime: dailyStudent.departureTime,
      departureReason: dailyStudent.departureReason,
      departureJustified: dailyStudent.departureJustified,
      departureNote: dailyStudent.departureNote
    };
  }

  private mapAttendanceStatus(status: string): RegistroAsistencia['estado'] {
    const normalized = this.normalizeAttendanceStatus(status);
    if (normalized === 'ATRASADO') {
      return 'Atraso';
    }
    if (normalized === 'AUSENTE') {
      return 'Ausente';
    }
    if (normalized === 'JUSTIFICADO') {
      return 'Justificado';
    }
    return 'Presente';
  }

  private mapCalendarAttendanceStatus(status: string | undefined): DiaCalendarioAsistencia['estado'] {
    const normalized = this.normalizeAttendanceStatus(status ?? '');
    if (normalized === 'ATRASADO') {
      return 'Atraso';
    }
    if (normalized === 'AUSENTE') {
      return 'Ausente';
    }
    if (normalized === 'JUSTIFICADO') {
      return 'Justificado';
    }
    if (normalized === 'PRESENTE') {
      return 'Presente';
    }
    return 'Vacio';
  }

  private attendanceStatusRegister(day: Pick<MonthlyAttendanceStudentDay, 'status' | 'departureTime'>): string {
    if (day.departureTime) {
      return `Retiro ${day.departureTime}`;
    }

    const normalized = this.normalizeAttendanceStatus(day.status);
    if (normalized === 'ATRASADO') {
      return 'Atraso';
    }
    if (normalized === 'AUSENTE') {
      return 'Sin registro';
    }
    if (normalized === 'JUSTIFICADO') {
      return 'Justificado';
    }
    return 'Registrado';
  }

  private attendanceStatusDetail(day: MonthlyAttendanceStudentDay): string {
    if (day.departureTime) {
      const reason = day.departureReason ? ` Motivo: ${this.departureReasonLabel(day.departureReason)}.` : '';
      const justification = day.departureJustified === false ? ' Pendiente de justificación.' : ' Salida justificada.';
      const note = day.departureNote ? ` ${day.departureNote}` : '';
      return `Retiro registrado a las ${day.departureTime}.${reason}${justification}${note}`;
    }

    const normalized = this.normalizeAttendanceStatus(day.status);
    if (normalized === 'ATRASADO') {
      return 'Ingreso marcado como atraso en el sistema.';
    }
    if (normalized === 'AUSENTE') {
      return 'Inasistencia registrada para la jornada.';
    }
    if (normalized === 'JUSTIFICADO') {
      return 'Ausencia justificada en el periodo.';
    }
    return 'Asistencia registrada correctamente.';
  }

  private departureReasonLabel(reason: NonNullable<MonthlyAttendanceStudentDay['departureReason']>): string {
    const labels: Record<NonNullable<MonthlyAttendanceStudentDay['departureReason']>, string> = {
      MEDICO: 'Médico',
      TRAMITE: 'Trámite',
      FAMILIAR: 'Familiar',
      OTRO: 'Otro'
    };
    return labels[reason] ?? reason;
  }

  private calendarStatusLabel(day: Pick<MonthlyAttendanceStudentDay, 'status' | 'departureTime'>): string | undefined {
    if (day.departureTime) {
      return `Retiro ${day.departureTime}`;
    }

    const normalized = this.normalizeAttendanceStatus(day.status ?? '');
    if (normalized === 'ATRASADO') {
      return 'Atraso';
    }
    if (normalized === 'AUSENTE') {
      return 'Ausente';
    }
    if (normalized === 'JUSTIFICADO') {
      return 'Justificado';
    }
    return undefined;
  }

  private formatAttendanceDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  private monthLabelFromValue(value: string): string {
    const [year, month] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('es-CL', {
      month: 'long',
      year: 'numeric'
    }).format(new Date(year, month - 1, 1));
  }

  private shiftMonth(value: string, amount: number): string {
    const [year, month] = value.split('-').map(Number);
    const date = new Date(year, month - 1 + amount, 1);
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
  }

  private normalizeAttendanceStatus(status: string): string {
    return status
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  private formatGradeValue(value: number | null | undefined): string {
    return value == null ? '-' : value.toFixed(1);
  }

  private gradeLevel(value: number | null | undefined): EvaluacionEstudiante['nivel'] {
    if (value == null || value < 4) {
      return 'Por mejorar';
    }
    if (value < 6) {
      return 'En progreso';
    }
    return 'Adecuado';
  }

  private formatShortDate(value: string): string {
    if (!value) {
      return '-';
    }
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  private familyContactName(name?: string, lastName?: string): string | null {
    const fullName = [name, lastName].filter(Boolean).join(' ').trim();
    if (!fullName) {
      return null;
    }
    return fullName;
  }

  private isLikelyPersonName(value: string): boolean {
    const text = value.trim();
    return !/[#,\d]/.test(text) && text.split(/\s+/).length >= 2;
  }

  private todayInputValue(): string {
    const today = new Date();
    return `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;
  }

  private currentMonthValue(): string {
    const today = new Date();
    return `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}`;
  }

  private isCurrentAttendanceMonth(): boolean {
    return this.selectedAttendanceMonth() === this.currentMonthValue();
  }

  private currentTimeValue(): string {
    const now = new Date();
    return `${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`;
  }

  private repairDisplayText(value: string): string {
    return value
      .replace(/Â·/g, '·')
      .replace(/Ã±/g, 'ñ')
      .replace(/Ã‘/g, 'Ñ')
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/MaÄ±ana/gi, 'Mañana')
      .replace(/Ma.?ana/gi, (match) => match.toUpperCase().startsWith('MA') && match.length >= 6 ? 'Mañana' : match);
  }

  private formatScheduleType(value: string): string {
    const repairedValue = this.repairDisplayText(value);
    const normalized = repairedValue
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

    if (normalized === 'MANANA') {
      return 'Mañana';
    }
    if (normalized === 'TARDE') {
      return 'Tarde';
    }
    if (normalized === 'COMPLETA' || normalized === 'JORNADA COMPLETA') {
      return 'Jornada completa';
    }
    return repairedValue;
  }

  private mapEnrollmentDocument(
    document: EnrollmentDocument,
    enrollmentId: number,
    index: number
  ): DocumentoEstudiante {
    const name = document.fileName || document.documentKey || `Documento ${index + 1}`;
    const type = this.documentType(name, document.mimeType);
    return {
      id: document.id ?? index + 1,
      documentKey: document.documentKey,
      enrollmentId,
      documentId: document.id,
      nombre: name,
      tipo: type,
      fecha: 'Cargado',
      estado: document.id ? 'Vigente' : 'Pendiente',
      icon: type === 'DOCX' ? 'article' : type === 'IMG' ? 'image' : 'picture_as_pdf'
    };
  }

  private mapEnrollmentDocumentSlot(
    slot: EnrollmentDocumentSlot,
    document: EnrollmentDocument | null,
    enrollmentId: number,
    index: number
  ): DocumentoEstudiante {
    if (document?.fileName?.trim()) {
      return {
        ...this.mapEnrollmentDocument(document, enrollmentId, index),
        documentKey: slot.key,
        nombre: slot.title,
        fecha: document.fileName
      };
    }

    return {
      id: -(index + 1),
      documentKey: slot.key,
      enrollmentId,
      documentId: null,
      nombre: slot.title,
      tipo: this.documentType(slot.title, null),
      fecha: slot.description,
      estado: 'Pendiente',
      icon: this.documentSlotIcon(slot.key)
    };
  }

  private documentForEnrollmentSlot(
    documentKey: string,
    documentsByKey: Map<string, EnrollmentDocument>
  ): EnrollmentDocument | null {
    return documentsByKey.get(documentKey)
      ?? this.legacyDocumentAliases(documentKey)
        .map((legacyKey) => documentsByKey.get(legacyKey))
        .find((document): document is EnrollmentDocument => !!document)
      ?? null;
  }

  private legacyDocumentAliases(documentKey: string): string[] {
    const aliases: Record<string, string[]> = {
      'image-consent': ['image-permission'],
      other: ['junaeb-sep', 'migratory-docs', 'priority-certificate']
    };

    return aliases[documentKey] ?? [];
  }

  private documentSlotIcon(documentKey: string): string {
    if (['study-certificate', 'behavior-report', 'report-card', 'pie-certificate'].includes(documentKey)) {
      return 'workspace_premium';
    }
    if (['vaccination-card', 'health-record', 'medical-report', 'medical-authorization'].includes(documentKey)) {
      return 'health_and_safety';
    }
    if (['contract', 'commitment-letter', 'image-consent', 'interview', 'simple-power', 'payment-receipt', 'other'].includes(documentKey)) {
      return 'folder_special';
    }
    return 'badge';
  }

  private documentType(fileName: string, mimeType?: string | null): DocumentoEstudiante['tipo'] {
    const normalizedMime = (mimeType ?? '').toLowerCase();
    const normalizedName = fileName.toLowerCase();
    if (normalizedMime.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/.test(normalizedName)) {
      return 'IMG';
    }
    if (normalizedMime.includes('word') || normalizedName.endsWith('.docx') || normalizedName.endsWith('.doc')) {
      return 'DOCX';
    }
    return 'PDF';
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}


