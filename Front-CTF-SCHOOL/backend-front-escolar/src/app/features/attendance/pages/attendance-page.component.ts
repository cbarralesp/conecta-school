import { HttpErrorResponse } from '@angular/common/http';
import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { DateAdapter, MAT_DATE_LOCALE, MatNativeDateModule, NativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { resolveCurrentAcademicSemester } from '../../../core/utils/academic-semester';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import {
  AttendanceCatalog,
  DailyAttendanceStudent,
  DailyAttendanceView,
  MonthlyAttendanceStudent,
  MonthlyAttendanceView,
  WeeklyAttendanceView
} from '../../../core/models/attendance.models';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type AttendanceTab = 'daily' | 'weekly' | 'monthly' | 'semester';
type AttendanceStatus = 'PRESENTE' | 'AUSENTE' | 'ATRASADO' | 'SUSPENDIDO' | 'SIN_MARCAR';
type MonthlySelection = 'all' | number;
type SemesterSelection = '1' | '2';
type AttendanceSpecialDateType = 'VACACIONES' | 'FERIADO' | 'INTERFERIADO' | 'SUSPENSION';

interface MonthlyCalendarCell {
  kind: 'empty' | 'day';
  date?: string;
  dayNumber?: number;
  isWeekend?: boolean;
  isFuture?: boolean;
  isToday?: boolean;
  specialType?: AttendanceSpecialDateType | null;
  specialLabel?: string | null;
  globalPercentage?: number | null;
  individualStatus?: string | null;
}

interface SemesterCalendarCell {
  dayNumber: number | null;
  specialMarker?: string | null;
  statusClass: string;
  statusLabel: string;
}

interface SemesterCalendarMonth {
  month: number;
  label: string;
  weeks: { weekKey: string; cells: SemesterCalendarCell[] }[];
}

interface AnnualCalendarSection {
  title: string;
  months: SemesterCalendarMonth[];
}

interface SemesterAggregatedStudent {
  studentId: number;
  run: string;
  fullName: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  percentage: number;
  riskStatus: string;
  days: Map<string, string>;
}

interface SemesterMonthSummaryCard {
  month: string;
  percentage: number;
  schoolDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  tone: 'success' | 'warning' | 'danger';
}

interface SemesterCourseAttendanceHighlight {
  courseId: number;
  courseName: string;
  studentName: string;
  studentRun: string;
  percentage: number;
}

interface AttendanceNoteDialogState {
  studentId: number;
  studentName: string;
  note: string;
}

interface ClassSuspensionDialogState {
  reason: string;
}

interface AttendanceDepartureDialogState {
  studentId: number;
  studentName: string;
  currentStatus: string;
  departureTime: string;
  reason: 'MEDICO' | 'TRAMITE' | 'FAMILIAR' | 'OTRO';
  isJustified: boolean;
  departureNote: string;
}

class MondayFirstDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 1;
  }
}

@Component({
  selector: 'app-attendance-page',
  imports: [
    NgClass,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './attendance-page.component.html',
  styleUrl: './attendance-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-CL' },
    { provide: DateAdapter, useClass: MondayFirstDateAdapter }
  ]
})
export class AttendancePageComponent {
  private static readonly SCHOOL_YEARS = [2025, 2026, 2027, 2028] as const;
  private static readonly DEFAULT_SCHOOL_YEAR = 2026;

  @ViewChild('monthlyPdfReport') private monthlyPdfRef?: ElementRef<HTMLElement>;

  private readonly attendanceApiService = inject(AttendanceApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly currentSchoolYear = AttendancePageComponent.DEFAULT_SCHOOL_YEAR;

  readonly user = this.authStateService.user;
  readonly schoolYears = AttendancePageComponent.SCHOOL_YEARS;
  readonly activeTab = signal<AttendanceTab>('daily');
  readonly dailySearch = signal('');
  readonly noteDialog = signal<AttendanceNoteDialogState | null>(null);
  readonly classSuspensionDialog = signal<ClassSuspensionDialogState | null>(null);
  readonly departureDialog = signal<AttendanceDepartureDialogState | null>(null);
  readonly monthlySearch = signal('');
  readonly selectedMonthlyStudentId = signal<MonthlySelection>('all');
  readonly selectedSemester = signal<SemesterSelection>(
    resolveCurrentAcademicSemester() === 2 ? '2' : '1'
  );
  readonly selectedSemesterStudentId = signal<MonthlySelection>('all');
  readonly catalog = signal<AttendanceCatalog | null>(null);
  readonly selectedSchoolYear = signal(this.defaultSchoolYear());
  readonly selectedCourseId = signal<number | null>(null);
  readonly selectedDate = signal(this.toIsoDate(new Date()));
  readonly selectedWeekStart = signal(this.toIsoDate(this.startOfWeek(new Date())));
  readonly selectedMonth = signal(this.toYearMonth(new Date()));
  readonly dailyView = signal<DailyAttendanceView | null>(null);
  readonly weeklyView = signal<WeeklyAttendanceView | null>(null);
  readonly monthlyView = signal<MonthlyAttendanceView | null>(null);
  readonly semesterViews = signal<MonthlyAttendanceView[]>([]);
  readonly annualViews = signal<MonthlyAttendanceView[]>([]);
  readonly semesterCourseHighlights = signal<SemesterCourseAttendanceHighlight[]>([]);
  readonly weeklyStatusBaseline = signal<Map<string, string>>(new Map());
  readonly monthlyStatusBaseline = signal<Map<string, string>>(new Map());
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);
  readonly isAnnualViewOpen = signal(false);
  readonly isAnnualViewLoading = signal(false);

  readonly orderedCourses = computed(() => this.catalog()?.courses ?? []);
  readonly coursesBySelectedYear = computed(() =>
    this.orderedCourses().filter((course) => course.schoolYear === this.selectedSchoolYear())
  );
  readonly selectedCourse = computed(
    () => this.orderedCourses().find((course) => course.id === this.selectedCourseId()) ?? null
  );
  readonly isClassSuspended = computed(() => this.dailyView()?.classSuspended ?? false);
  readonly dailyCounters = computed(() => ({
    total: this.dailyView()?.totalStudents ?? 0,
    present: this.dailyView()?.presentCount ?? 0,
    absent: this.dailyView()?.absentCount ?? 0,
    late: this.dailyView()?.lateCount ?? 0
  }));
  readonly filteredDailyStudents = computed(() => {
    const query = this.dailySearch().trim().toLowerCase();
    const students = this.dailyView()?.students ?? [];
    if (!query) {
      return students;
    }

    return students.filter((student) =>
      student.fullName.toLowerCase().includes(query) || student.run.toLowerCase().includes(query)
    );
  });
  readonly dailyProgress = computed(() => {
    return {
      marked: this.dailyView()?.summary.markedCount ?? 0,
      total: this.dailyCounters().total,
      percent: this.dailyView()?.summary.progressPercent ?? 0
    };
  });
  readonly dailyPercentages = computed(() => {
    return {
      present: this.dailyView()?.summary.presentPercentage ?? 0,
      absent: this.dailyView()?.summary.absentPercentage ?? 0,
      late: this.dailyView()?.summary.latePercentage ?? 0
    };
  });
  readonly weeklySummary = computed(() => {
    return {
      average: this.weeklyView()?.summary.averageAttendance ?? 0,
      absences: this.weeklyView()?.summary.totalAbsences ?? 0,
      late: this.weeklyView()?.summary.totalLate ?? 0,
      alerts: this.weeklyView()?.summary.activeAlerts ?? 0
    };
  });
  readonly monthlyDistribution = computed(() => {
    return (
      this.monthlyView()?.distribution ?? {
        presentCount: 0,
        presentPercentage: 0,
        absentCount: 0,
        absentPercentage: 0,
        lateCount: 0,
        latePercentage: 0
      }
    );
  });
  readonly monthlyDailySummary = computed(() => this.monthlyView()?.dailySummary ?? []);
  readonly monthlySpecialDates = computed(() => {
    const specialDates = new Map<string, { type: AttendanceSpecialDateType; label: string }>();
    for (const specialDate of this.monthlyView()?.specialDates ?? []) {
      specialDates.set(specialDate.date, {
        type: specialDate.type,
        label: specialDate.label
      });
    }
    return specialDates;
  });
  readonly weeklyEditProgress = computed(() => {
    const view = this.weeklyView();
    const baseline = this.weeklyStatusBaseline();
    if (!view) {
      return { marked: 0, total: 0, dirty: 0 };
    }

    let marked = 0;
    let total = 0;
    let dirty = 0;

    for (const student of view.students) {
      for (const day of student.days) {
        if (!this.isWeeklyEditableStatus(day.status)) {
          continue;
        }

        total += 1;
        if (day.status !== 'SIN_MARCAR') {
          marked += 1;
        }

        const key = this.weeklyStatusKey(student.studentId, day.date);
        const original = baseline.get(key) ?? 'SIN_MARCAR';
        if ((day.status || 'SIN_MARCAR') !== original) {
          dirty += 1;
        }
      }
    }

    return { marked, total, dirty };
  });
  readonly filteredMonthlyStudents = computed(() => {
    const query = this.monthlySearch().trim().toLowerCase();
    const students = this.monthlyView()?.students ?? [];
    if (!query) {
      return students;
    }

    return students.filter((student) =>
      student.fullName.toLowerCase().includes(query) || student.run.toLowerCase().includes(query)
    );
  });
  readonly selectedMonthlyStudent = computed(() => {
    const selected = this.selectedMonthlyStudentId();
    if (selected === 'all') {
      return null;
    }
    return this.monthlyView()?.students.find((student) => student.studentId === selected) ?? null;
  });
  readonly monthlyCalendarCells = computed<MonthlyCalendarCell[]>(() => {
    const month = this.selectedMonth();
    if (!month) {
      return [];
    }

    const [year, monthNumber] = month.split('-').map(Number);
    if (!year || !monthNumber) {
      return [];
    }

    const firstDay = new Date(year, monthNumber - 1, 1);
    const lastDay = new Date(year, monthNumber, 0);
    const offset = (firstDay.getDay() + 6) % 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: MonthlyCalendarCell[] = [];
    for (let index = 0; index < offset; index++) {
      cells.push({ kind: 'empty' });
    }

    const daySummary = new Map(
      this.monthlyDailySummary().map((day) => [Number(day.dayLabel), day.attendancePercentage])
    );
    const selectedStudentDays = new Map(
      (this.selectedMonthlyStudent()?.days ?? []).map((day) => [day.date, day.status])
    );

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const current = new Date(year, monthNumber - 1, day);
      current.setHours(0, 0, 0, 0);
      const iso = this.toIsoDate(current);
      const weekend = current.getDay() === 0 || current.getDay() === 6;
      const isFuture = current.getTime() > today.getTime();
      const isToday = current.getTime() === today.getTime();
      const specialDate = this.monthlySpecialDates().get(iso);

      cells.push({
        kind: 'day',
        date: iso,
        dayNumber: day,
        isWeekend: weekend,
        isFuture,
        isToday,
        specialType: specialDate?.type ?? null,
        specialLabel: specialDate?.label ?? null,
        globalPercentage: daySummary.get(day) ?? null,
        individualStatus: selectedStudentDays.get(iso) ?? null
      });
    }

    return cells;
  });
  readonly monthlyCalendarTitle = computed(() => {
    const selectedStudent = this.selectedMonthlyStudent();
    return selectedStudent ? selectedStudent.fullName : this.monthlyView()?.monthLabel ?? 'Resumen mensual';
  });
  readonly monthlyCalendarSubtitle = computed(() => {
    return this.selectedMonthlyStudent()
      ? 'Historial individual de asistencia'
      : 'Promedio de asistencia por día';
  });
  readonly monthlyStudentSummary = computed(() => {
    const student = this.selectedMonthlyStudent();
    if (!student) {
      return {
        present: this.monthlyDistribution().presentCount,
        absent: this.monthlyDistribution().absentCount,
        late: this.monthlyDistribution().lateCount,
        percentage: this.monthlyView()?.averageAttendance ?? 0
      };
    }

    return {
      present: student.presentCount,
      absent: student.absentCount,
      late: student.lateCount,
      percentage: Math.min(100, student.presentPercentage + student.latePercentage)
    };
  });
  readonly monthlyEditableDates = computed(() => {
    return new Set(
      this.monthlyCalendarCells()
        .filter((cell) => this.isMonthlyEditableCell(cell))
        .map((cell) => cell.date as string)
    );
  });
  readonly monthlyEditProgress = computed(() => {
    const selectedStudent = this.selectedMonthlyStudent();
    if (!selectedStudent) {
      return { marked: 0, total: 0, dirty: 0 };
    }

    const baseline = this.monthlyStatusBaseline();
    const editableDates = this.monthlyEditableDates();
    const statusByDate = new Map(selectedStudent.days.map((day) => [day.date, day.status]));
    let marked = 0;
    let dirty = 0;

    for (const date of editableDates) {
      const status = statusByDate.get(date) ?? 'SIN_MARCAR';
      if (status !== 'SIN_MARCAR') {
        marked += 1;
      }

      const original = baseline.get(this.monthlyStatusKey(selectedStudent.studentId, date)) ?? 'SIN_MARCAR';
      if (status !== original) {
        dirty += 1;
      }
    }

    return { marked, total: editableDates.size, dirty };
  });
  readonly semesterMonths = computed(() => {
    const schoolYear = this.selectedCourse()?.schoolYear ?? this.selectedSchoolYear();
    const startMonth = this.selectedSemester() === '1' ? 1 : 7;
    return Array.from({ length: 6 }, (_, index) => {
      const monthNumber = startMonth + index;
      return {
        monthNumber,
        value: `${schoolYear}-${`${monthNumber}`.padStart(2, '0')}`
      };
    });
  });
  readonly semesterStudents = computed<SemesterAggregatedStudent[]>(() => {
    const aggregate = new Map<number, SemesterAggregatedStudent>();
    const totalSchoolDays = this.semesterViews().reduce((sum, view) => sum + (view.schoolDays ?? 0), 0);

    for (const month of this.semesterViews()) {
      for (const student of month.students) {
        const current =
          aggregate.get(student.studentId) ??
          {
            studentId: student.studentId,
            run: student.run,
            fullName: student.fullName,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            percentage: 0,
            riskStatus: 'NORMAL',
            days: new Map<string, string>()
          };

        current.presentCount += student.presentCount;
        current.absentCount += student.absentCount;
        current.lateCount += student.lateCount;

        for (const day of student.days) {
          current.days.set(day.date, day.status);
        }

        aggregate.set(student.studentId, current);
      }
    }

    return Array.from(aggregate.values())
      .map((student) => {
        const attendanceLike = student.presentCount + student.lateCount;
        const percentage = totalSchoolDays > 0 ? Math.round((attendanceLike * 100) / totalSchoolDays) : 0;
        return {
          ...student,
          percentage,
          riskStatus: this.resolveSemesterRisk(student.absentCount, student.lateCount)
        };
      })
      .sort((left, right) => left.fullName.localeCompare(right.fullName, 'es'));
  });
  readonly selectedSemesterStudent = computed(() => {
    const selected = this.selectedSemesterStudentId();
    if (selected === 'all') {
      return null;
    }
    return this.semesterStudents().find((student) => student.studentId === selected) ?? null;
  });
  readonly selectedAnnualStudent = computed(() => {
    const selected = this.selectedSemesterStudentId();
    if (selected === 'all') {
      return null;
    }

    let fullName = '';
    let run = '';
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    const days = new Map<string, string>();

    for (const view of this.annualViews()) {
      const student = view.students.find((item) => item.studentId === selected);
      if (!student) {
        continue;
      }

      fullName = student.fullName;
      run = student.run;
      presentCount += student.presentCount;
      absentCount += student.absentCount;
      lateCount += student.lateCount;

      for (const day of student.days) {
        days.set(day.date, day.status);
      }
    }

    if (!fullName) {
      return null;
    }

    const totalSchoolDays = this.annualViews().reduce((sum, view) => sum + (view.schoolDays ?? 0), 0);
    const attendanceLike = presentCount + lateCount;
    const percentage = totalSchoolDays > 0 ? Math.round((attendanceLike * 100) / totalSchoolDays) : 0;

    return {
      studentId: selected,
      run,
      fullName,
      presentCount,
      absentCount,
      lateCount,
      percentage,
      riskStatus: this.resolveSemesterRisk(absentCount, lateCount),
      days
    } satisfies SemesterAggregatedStudent;
  });
  readonly semesterSummary = computed(() => {
    const selectedStudent = this.selectedSemesterStudent();
    const months = this.semesterViews();
    const totalSchoolDays = months.reduce((sum, view) => sum + (view.schoolDays ?? 0), 0);

    if (selectedStudent) {
      return {
        schoolDays: totalSchoolDays,
        percentage: selectedStudent.percentage,
        absences: selectedStudent.absentCount,
        late: selectedStudent.lateCount,
        label: selectedStudent.fullName
      };
    }

    const students = this.semesterStudents();
    const presentCount = students.reduce((sum, student) => sum + student.presentCount, 0);
    const absentCount = students.reduce((sum, student) => sum + student.absentCount, 0);
    const lateCount = students.reduce((sum, student) => sum + student.lateCount, 0);
    const studentSlots = totalSchoolDays * Math.max(1, students.length);
    const percentage = studentSlots > 0 ? Math.round(((presentCount + lateCount) * 100) / studentSlots) : 0;

    return {
      schoolDays: totalSchoolDays,
      percentage,
      absences: absentCount,
      late: lateCount,
      label: this.selectedCourse()?.name ?? 'Curso'
    };
  });
  readonly semesterHeadline = computed(() => {
    const months = this.semesterViews();
    if (months.length === 0) {
      const schoolYear = this.selectedCourse()?.schoolYear ?? this.selectedSchoolYear();
      return this.selectedSemester() === '1'
        ? `Enero a Junio ${schoolYear}`
        : `Julio a Diciembre ${schoolYear}`;
    }

    return `${months[0]?.monthLabel ?? ''} a ${months[months.length - 1]?.monthLabel ?? ''}`
      .replace(/\s+\d{4}\s+a\s+/, ' a ')
      .trim();
  });
  readonly semesterCalendarMonths = computed<SemesterCalendarMonth[]>(() =>
    this.semesterViews().map((month) => this.buildSemesterCalendarMonth(month))
  );
  readonly annualCalendarSections = computed<AnnualCalendarSection[]>(() => {
    const months = this.annualViews()
      .map((view) => this.buildSemesterCalendarMonth(view, this.selectedAnnualStudent()?.days ?? null))
      .sort((left, right) => left.month - right.month);

    return [
      {
        title: 'Marzo a Julio',
        months: months.filter((month) => month.month >= 3 && month.month <= 7)
      },
      {
        title: 'Agosto a Diciembre',
        months: months.filter((month) => month.month >= 8 && month.month <= 12)
      }
    ].filter((section) => section.months.length > 0);
  });
  readonly semesterMonthSummaryCards = computed<SemesterMonthSummaryCard[]>(() => {
    const selectedStudent = this.selectedSemesterStudent();
    const rows = this.semesterViews()
      .map((view) => {
        const month = view.monthLabel.replace(/\s+\d{4}\b/, '').replace(/^\w/, (char) => char.toUpperCase());

        if (!selectedStudent) {
          return {
            month,
            percentage: view.averageAttendance ?? 0,
            schoolDays: view.schoolDays ?? 0,
            presentCount: view.distribution?.presentCount ?? 0,
            absentCount: view.distribution?.absentCount ?? 0,
            lateCount: view.totalLate ?? 0,
            tone: this.semesterMonthTone(view.averageAttendance ?? 0)
          };
        }

        const student = view.students.find((item) => item.studentId === selectedStudent.studentId);
        const percentage = student ? Math.min(100, student.presentPercentage + student.latePercentage) : 0;

        return {
          month,
          percentage,
          schoolDays: view.schoolDays ?? 0,
          presentCount: student?.presentCount ?? 0,
          absentCount: student?.absentCount ?? 0,
          lateCount: student?.lateCount ?? 0,
          tone: this.semesterMonthTone(percentage)
        };
      })
      .filter((row) => row.schoolDays > 0 || row.presentCount > 0 || row.absentCount > 0 || row.lateCount > 0);

    return rows.length > 0 ? rows : this.semesterViews().map((view) => ({
      month: view.monthLabel.replace(/\s+\d{4}\b/, '').replace(/^\w/, (char) => char.toUpperCase()),
      percentage: 0,
      schoolDays: view.schoolDays ?? 0,
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      tone: 'danger'
    }));
  });

  constructor() {
    this.loadCatalog();
  }

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }

  setTab(tab: AttendanceTab): void {
    this.activeTab.set(tab);
    this.loadActiveView();
  }

  updateCourse(courseId: number | null): void {
    this.selectedCourseId.set(courseId);
    this.selectedMonthlyStudentId.set('all');
    this.selectedSemesterStudentId.set('all');
    if (!courseId) {
      this.dailyView.set(null);
      this.weeklyView.set(null);
      this.monthlyView.set(null);
      this.semesterViews.set([]);
      this.annualViews.set([]);
      this.semesterCourseHighlights.set([]);
      return;
    }

    // Keep the roster ready for the daily pass even when the user is browsing
    // weekly or monthly summaries.
    this.loadDailyView();

    if (this.activeTab() === 'weekly') {
      this.loadWeeklyView();
      return;
    }

    if (this.activeTab() === 'monthly') {
      this.loadMonthlyView();
      return;
    }

    if (this.activeTab() === 'semester') {
      this.loadSemesterView();
    }

    if (this.isAnnualViewOpen()) {
      this.loadAnnualView();
    }
  }

  updateSchoolYear(value: string | number): void {
    const nextYear = Number(value);
    if (!Number.isFinite(nextYear)) {
      return;
    }

    this.selectedSchoolYear.set(nextYear);
    this.selectedCourseId.set(this.coursesBySelectedYear()[0]?.id ?? null);
    this.selectedMonthlyStudentId.set('all');
    this.selectedSemesterStudentId.set('all');
    this.syncDateFiltersToSchoolYear(nextYear);
    this.loadActiveView();

    if (this.isAnnualViewOpen()) {
      this.loadAnnualView();
    }
  }

  updateDate(value: string): void {
    this.selectedDate.set(value);
    this.loadDailyView();
  }

  updateDateFromPicker(value: Date | null): void {
    if (!value) {
      return;
    }
    this.updateDate(this.toIsoDate(value));
  }

  updateWeekStart(value: string): void {
    this.selectedWeekStart.set(value);
    this.loadWeeklyView();
  }

  updateMonth(value: string): void {
    this.selectedMonth.set(value);
    this.selectedMonthlyStudentId.set('all');
    this.loadMonthlyView();
  }

  updateSemester(value: SemesterSelection): void {
    this.selectedSemester.set(value);
    this.selectedSemesterStudentId.set('all');
    if (this.activeTab() === 'semester') {
      this.loadSemesterView();
    }
  }

  updateDailySearch(value: string): void {
    this.dailySearch.set(value);
  }

  updateMonthlySearch(value: string): void {
    this.monthlySearch.set(value);
  }

  selectMonthlyStudent(studentId: MonthlySelection): void {
    this.selectedMonthlyStudentId.set(studentId);
  }

  selectSemesterStudent(studentId: MonthlySelection): void {
    this.selectedSemesterStudentId.set(studentId);
  }

  updateWeeklyCell(studentId: number, date: string): void {
    if (this.isSaving()) {
      return;
    }

    this.weeklyView.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) => {
        if (student.studentId !== studentId) {
          return student;
        }

        return {
          ...student,
          days: student.days.map((day) =>
            day.date === date && this.isWeeklyEditableStatus(day.status)
              ? { ...day, status: this.nextInlineAttendanceStatus(day.status) }
              : day
          )
        };
      });

      return this.recalculateWeekly(current, students);
    });
  }

  resetWeeklyAttendance(): void {
    const baseline = this.weeklyStatusBaseline();
    this.weeklyView.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) => ({
        ...student,
        days: student.days.map((day) => ({
          ...day,
          status: baseline.get(this.weeklyStatusKey(student.studentId, day.date)) ?? 'SIN_MARCAR'
        }))
      }));

      return this.recalculateWeekly(current, students);
    });
  }

  saveWeeklyAttendance(): void {
    const courseId = this.selectedCourseId();
    const view = this.weeklyView();
    if (!courseId || !view || this.isSaving()) {
      return;
    }

    const changesByDate = new Map<string, Map<number, AttendanceStatus>>();
    for (const student of view.students) {
      for (const day of student.days) {
        if (!this.isWeeklyEditableStatus(day.status)) {
          continue;
        }

        const key = this.weeklyStatusKey(student.studentId, day.date);
        const original = this.weeklyStatusBaseline().get(key) ?? 'SIN_MARCAR';
        const currentStatus = (day.status || 'SIN_MARCAR') as AttendanceStatus;
        if (currentStatus === original) {
          continue;
        }

        const dateChanges = changesByDate.get(day.date) ?? new Map<number, AttendanceStatus>();
        dateChanges.set(student.studentId, currentStatus);
        changesByDate.set(day.date, dateChanges);
      }
    }

    this.persistInlineAttendanceChanges(changesByDate, 'Asistencia semanal guardada correctamente');
  }

  updateMonthlyCell(date: string): void {
    if (this.isSaving()) {
      return;
    }

    const selectedStudentId = this.selectedMonthlyStudentId();
    if (selectedStudentId === 'all') {
      return;
    }

    this.monthlyView.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) => {
        if (student.studentId !== selectedStudentId) {
          return student;
        }

        const currentDays = new Map(student.days.map((day) => [day.date, day.status]));
        currentDays.set(date, this.nextInlineAttendanceStatus(currentDays.get(date) ?? 'SIN_MARCAR'));

        return this.recalculateMonthlyStudent(
          {
            ...student,
            days: Array.from(currentDays.entries())
              .map(([dayDate, status]) => ({ date: dayDate, status }))
              .sort((left, right) => left.date.localeCompare(right.date))
          },
          current.schoolDays
        );
      });

      return { ...current, students };
    });
  }

  resetMonthlyAttendance(): void {
    const selectedStudentId = this.selectedMonthlyStudentId();
    if (selectedStudentId === 'all') {
      return;
    }

    this.monthlyView.update((current) => {
      if (!current) {
        return current;
      }

      const originalDays = this.buildMonthlyStudentDaysFromBaseline(selectedStudentId);
      return {
        ...current,
        students: current.students.map((student) =>
          student.studentId === selectedStudentId
            ? this.recalculateMonthlyStudent({ ...student, days: originalDays }, current.schoolDays)
            : student
        )
      };
    });
  }

  saveMonthlyAttendance(): void {
    const courseId = this.selectedCourseId();
    const selectedStudent = this.selectedMonthlyStudent();
    if (!courseId || !selectedStudent || this.isSaving()) {
      return;
    }

    const changesByDate = new Map<string, Map<number, AttendanceStatus>>();
    const currentDays = new Map(selectedStudent.days.map((day) => [day.date, day.status]));

    for (const date of this.monthlyEditableDates()) {
      const currentStatus = (currentDays.get(date) ?? 'SIN_MARCAR') as AttendanceStatus;
      const original = this.monthlyStatusBaseline().get(this.monthlyStatusKey(selectedStudent.studentId, date)) ?? 'SIN_MARCAR';
      if (currentStatus === original) {
        continue;
      }

      changesByDate.set(date, new Map([[selectedStudent.studentId, currentStatus]]));
    }

    this.persistInlineAttendanceChanges(changesByDate, 'Asistencia mensual guardada correctamente');
  }

  openAnnualView(): void {
    if (!this.selectedCourseId()) {
      return;
    }

    this.isAnnualViewOpen.set(true);
    this.loadAnnualView();
  }

  closeAnnualView(): void {
    this.isAnnualViewOpen.set(false);
  }

  updateStudentNote(studentId: number, value: string): void {
    this.dailyView.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) =>
        student.studentId === studentId ? { ...student, note: value || null } : student
      );

      return { ...current, students };
    });
  }

  openStudentNote(student: DailyAttendanceStudent): void {
    this.noteDialog.set({
      studentId: student.studentId,
      studentName: student.fullName,
      note: student.note ?? ''
    });
  }

  updateNoteDraft(value: string): void {
    this.noteDialog.update((current) => (current ? { ...current, note: value } : current));
  }

  closeStudentNote(): void {
    this.noteDialog.set(null);
  }

  saveStudentNote(): void {
    const dialog = this.noteDialog();
    if (!dialog) {
      return;
    }

    this.updateStudentNote(dialog.studentId, dialog.note.trim());
    this.closeStudentNote();
  }

  openDepartureDialog(student: DailyAttendanceStudent): void {
    this.departureDialog.set({
      studentId: student.studentId,
      studentName: student.fullName,
      currentStatus: student.status,
      departureTime: student.departureTime ?? '',
      reason: student.departureReason ?? 'MEDICO',
      isJustified: student.departureJustified ?? true,
      departureNote: student.departureNote ?? ''
    });
  }

  closeDepartureDialog(): void {
    this.departureDialog.set(null);
  }

  cancelDepartureDialog(): void {
    this.closeDepartureDialog();
  }

  updateDepartureTime(value: string): void {
    this.departureDialog.update((current) =>
      current ? { ...current, departureTime: value || '' } : current
    );
  }

  updateDepartureReason(reason: AttendanceDepartureDialogState['reason']): void {
    this.departureDialog.update((current) => (current ? { ...current, reason } : current));
  }

  updateDepartureJustified(isJustified: boolean): void {
    this.departureDialog.update((current) => (current ? { ...current, isJustified } : current));
  }

  updateDepartureNote(value: string): void {
    this.departureDialog.update((current) => (current ? { ...current, departureNote: value } : current));
  }

  saveDepartureDialog(): void {
    const dialog = this.departureDialog();
    const current = this.dailyView();
    const courseId = this.selectedCourseId();
    if (!dialog || !current || !courseId || this.isSaving()) {
      return;
    }

    const departureTime = dialog.departureTime.trim();
    const students = current.students.map((student) => {
      if (student.studentId !== dialog.studentId) {
        return student;
      }

      const nextStatus =
        departureTime && !['PRESENTE', 'ATRASADO'].includes(student.status) ? 'PRESENTE' : student.status;

      return {
        ...student,
        status: nextStatus,
        departureTime: departureTime || null,
        departureReason: departureTime ? dialog.reason : null,
        departureJustified: departureTime ? dialog.isJustified : null,
        departureNote: departureTime ? dialog.departureNote.trim() || null : null
      };
    });

    const nextView = this.recalculateDaily(current, students);
    this.isSaving.set(true);
    this.attendanceApiService
      .saveDaily(this.buildDailySavePayload(courseId, nextView))
      .subscribe({
        next: (view) => {
          this.dailyView.set(view);
          this.isSaving.set(false);
          this.closeDepartureDialog();
          this.snackBar.open('Salida guardada correctamente', 'Cerrar', { duration: 2600 });
          this.loadWeeklyView();
          this.loadMonthlyView();
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.showError(error, 'No fue posible guardar la salida');
        }
      });
  }

  clearDepartureDialog(): void {
    const dialog = this.departureDialog();
    const current = this.dailyView();
    const courseId = this.selectedCourseId();
    if (!dialog || !current || !courseId || this.isSaving()) {
      return;
    }

    const nextView = {
      ...current,
      students: current.students.map((student) =>
        student.studentId === dialog.studentId
          ? {
              ...student,
              departureTime: null,
              departureReason: null,
              departureJustified: null,
              departureNote: null
            }
          : student
      )
    };

    this.isSaving.set(true);
    this.attendanceApiService
      .saveDaily(this.buildDailySavePayload(courseId, nextView))
      .subscribe({
        next: (view) => {
          this.dailyView.set(view);
          this.isSaving.set(false);
          this.closeDepartureDialog();
          this.snackBar.open('Salida eliminada correctamente', 'Cerrar', { duration: 2600 });
          this.loadWeeklyView();
          this.loadMonthlyView();
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.showError(error, 'No fue posible eliminar la salida');
        }
      });
  }

  openClassSuspensionDialog(): void {
    const current = this.dailyView();
    if (!current || current.classSuspended || this.isSaving()) {
      return;
    }

    this.classSuspensionDialog.set({
      reason: current.suspensionMessage?.trim() || ''
    });
  }

  closeClassSuspensionDialog(): void {
    this.classSuspensionDialog.set(null);
  }

  updateClassSuspensionReason(value: string): void {
    this.classSuspensionDialog.update((current) => (current ? { ...current, reason: value } : current));
  }

  confirmClassSuspension(): void {
    const dialog = this.classSuspensionDialog();
    if (!dialog) {
      return;
    }

    const reason = dialog.reason.trim();
    if (!reason) {
      this.snackBar.open('Agrega el motivo de la suspensión de clases', 'Cerrar', { duration: 2600 });
      return;
    }

    this.closeClassSuspensionDialog();
    this.persistClassSuspension(true, reason);
  }

  setStudentStatus(studentId: number, status: AttendanceStatus): void {
    if (this.isClassSuspended()) {
      return;
    }
    this.dailyView.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) =>
        student.studentId === studentId
          ? {
              ...student,
              status,
              arrivalTime:
                status === 'ATRASADO'
                  ? student.arrivalTime || this.defaultArrivalTime()
                  : null,
              departureTime: ['PRESENTE', 'ATRASADO'].includes(status) ? student.departureTime : null,
              departureReason: ['PRESENTE', 'ATRASADO'].includes(status) ? student.departureReason : null,
              departureJustified: ['PRESENTE', 'ATRASADO'].includes(status) ? student.departureJustified : null,
              departureNote: ['PRESENTE', 'ATRASADO'].includes(status) ? student.departureNote : null
            }
          : student
      );

      return this.recalculateDaily(current, students);
    });
  }

  updateArrivalTime(studentId: number, value: string): void {
    if (this.isClassSuspended()) {
      return;
    }
    this.dailyView.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) =>
        student.studentId === studentId ? { ...student, arrivalTime: value || null } : student
      );

      return { ...current, students };
    });
  }

  markAll(status: AttendanceStatus): void {
    if (this.isClassSuspended()) {
      return;
    }
    this.dailyView.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) => ({
        ...student,
        status,
        arrivalTime: status === 'ATRASADO' ? student.arrivalTime || this.defaultArrivalTime() : null
      }));

      return this.recalculateDaily(current, students);
    });
  }

  resetDailyAttendance(): void {
    if (this.isClassSuspended()) {
      return;
    }
    this.dailyView.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) => ({
        ...student,
        status: 'SIN_MARCAR',
        arrivalTime: null,
        departureTime: null,
        departureReason: null,
        departureJustified: null,
        departureNote: null
      }));

      return this.recalculateDaily(current, students);
    });
  }

  moveDay(direction: -1 | 1): void {
    const current = this.selectedDateAsDate();
    if (!current) {
      return;
    }

    const next = new Date(current);
    next.setDate(next.getDate() + direction);
    this.updateDate(this.toIsoDate(next));
  }

  saveDailyAttendance(): void {
    const current = this.dailyView();
    const courseId = this.selectedCourseId();
    if (!current || !courseId || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.attendanceApiService
      .saveDaily(this.buildDailySavePayload(courseId, current))
      .subscribe({
        next: (view) => {
          this.dailyView.set(view);
          this.isSaving.set(false);
          this.snackBar.open('Asistencia guardada correctamente', 'Cerrar', { duration: 2600 });
          this.loadWeeklyView();
          this.loadMonthlyView();
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.showError(error, 'No fue posible guardar la asistencia');
        }
      });
  }

  toggleClassSuspension(): void {
    const current = this.dailyView();
    const courseId = this.selectedCourseId();
    if (!current || !courseId || this.isSaving()) {
      return;
    }

    if (!current.classSuspended) {
      this.openClassSuspensionDialog();
      return;
    }

    const nextState = !current.classSuspended;
    this.isSaving.set(true);
    this.attendanceApiService
      .saveDaily({
        courseId,
        date: this.selectedDate(),
        classSuspended: nextState,
        suspensionReason: nextState ? 'Clases suspendidas' : null,
        entries: current.students.map((student) => ({
          studentId: student.studentId,
          status: student.status,
          arrivalTime: student.arrivalTime,
          note: student.note,
          departureTime: student.departureTime,
          departureReason: student.departureReason,
          departureJustified: student.departureJustified,
          departureNote: student.departureNote
        }))
      })
      .subscribe({
        next: (view) => {
          this.dailyView.set(view);
          this.isSaving.set(false);
          this.snackBar.open(
            nextState ? 'La jornada quedó marcada como clases suspendidas' : 'La jornada volvió a estar habilitada',
            'Cerrar',
            { duration: 2800 }
          );
          this.loadWeeklyView();
          this.loadMonthlyView();
          this.loadSemesterView();
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.showError(error, 'No fue posible actualizar la suspensión de clases');
        }
      });
  }

  async exportMonthlyReport(): Promise<void> {
    const monthly = this.monthlyView();
    const exportTarget = this.monthlyPdfRef?.nativeElement;
    if (!monthly || !exportTarget || this.isExporting()) {
      return;
    }

    try {
      this.isExporting.set(true);
      const canvas = await html2canvas(exportTarget, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
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

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, width, height, undefined, 'FAST');
      const studentToken = this.monthlySearch().trim()
        ? `-${this.monthlySearch()
            .trim()
            .toLowerCase()
            .replaceAll(' ', '-')}`
        : '';
      pdf.save(
        `asistencia-${this.selectedMonth()}-${(this.selectedCourse()?.name ?? 'curso').replaceAll(' ', '-').toLowerCase()}${studentToken}.pdf`
      );
      this.snackBar.open('Reporte mensual descargado', 'Cerrar', { duration: 2600 });
    } catch {
      this.snackBar.open('No fue posible exportar el reporte mensual', 'Cerrar', { duration: 3200 });
    } finally {
      this.isExporting.set(false);
    }
  }

  exportJson(): void {
    if (this.isExporting()) {
      return;
    }

    const selectedCourse = this.selectedCourse();
    const currentPayload = this.buildCurrentJsonExportPayload();
    if (!selectedCourse || !currentPayload) {
      this.snackBar.open('No hay datos de asistencia para exportar', 'Cerrar', { duration: 2800 });
      return;
    }

    this.isExporting.set(true);
    const yearMonths = this.buildSchoolYearMonths(selectedCourse.schoolYear);
    forkJoin(
      yearMonths.map((month) =>
        this.attendanceApiService.getMonthly(selectedCourse.id, month).pipe(
          catchError(() => of(null))
        )
      )
    ).subscribe({
      next: (monthlyViews) => {
        const payload = {
          ...currentPayload,
          yearHistory: {
            schoolYear: selectedCourse.schoolYear,
            months: yearMonths.map((month, index) => ({
              month,
              attendance: monthlyViews[index]
            })),
            monthsWithData: monthlyViews.filter((view) => !!view).length
          }
        };

        this.downloadJsonFile(payload);
        this.isExporting.set(false);
        this.snackBar.open('JSON descargado correctamente', 'Cerrar', { duration: 2400 });
      },
      error: () => {
        this.isExporting.set(false);
        this.snackBar.open('No fue posible exportar el historial anual de asistencia', 'Cerrar', {
          duration: 3200
        });
      }
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PRESENTE':
        return 'Presente';
      case 'AUSENTE':
        return 'Ausente';
      case 'ATRASADO':
        return 'Atrasado';
      case 'SUSPENDIDO':
        return 'Suspensión';
      case 'CLASES_SUSPENDIDAS':
        return 'Clases suspendidas';
      default:
        return 'Sin marcar';
    }
  }

  shortStatusLabel(status: string | null | undefined, empty = 'X'): string {
    switch (status) {
      case 'PRESENTE':
        return 'P';
      case 'AUSENTE':
        return 'A';
      case 'ATRASADO':
        return 'T';
      case 'SUSPENDIDO':
        return 'S';
      case 'CLASES_SUSPENDIDAS':
        return 'CS';
      default:
        return empty;
    }
  }

  departureReasonLabel(reason: AttendanceDepartureDialogState['reason']): string {
    switch (reason) {
      case 'MEDICO':
        return 'Control medico';
      case 'TRAMITE':
        return 'Tramite';
      case 'FAMILIAR':
        return 'Salida con apoderado';
      default:
        return 'Otro motivo';
    }
  }

  badgeClass(status: string): string {
    switch (status) {
      case 'PRESENTE':
      case 'NORMAL':
        return 'is-success';
      case 'AUSENTE':
      case 'CRITICO':
      case 'RIESGO':
        return 'is-danger';
      case 'SUSPENDIDO':
        return 'is-info';
      default:
        return 'is-warning';
    }
  }

  dotClass(status: string): string {
    switch (status) {
      case 'PRESENTE':
        return 'dot-success';
      case 'AUSENTE':
        return 'dot-danger';
      case 'ATRASADO':
        return 'dot-warning';
      case 'SUSPENDIDO':
        return 'dot-info';
      case 'CLASES_SUSPENDIDAS':
        return 'dot-info';
      default:
        return 'dot-empty';
    }
  }

  monthlyBarClass(percentage: number): string {
    if (percentage >= 80) {
      return 'is-success';
    }

    if (percentage >= 60) {
      return 'is-warning';
    }

    return 'is-danger';
  }

  monthlyPercentageClass(percentage: number): string {
    if (percentage >= 80) {
      return 'text-success';
    }

    if (percentage >= 60) {
      return 'text-warning';
    }

    return 'text-danger';
  }

  monthlyDistributionLabel(): string {
    return this.monthlySearch().trim() ? 'Distribución del estudiante' : 'Distribución del mes';
  }

  monthlyCalendarClass(percentage: number): string {
    return percentage >= 80 ? 'is-success' : 'is-danger';
  }

  monthlyOverallPercentage(student: MonthlyAttendanceStudent): number {
    return Math.min(100, student.presentPercentage + student.latePercentage);
  }

  exportDisabledMessage(format: 'excel' | 'word' | 'pdf'): string {
    return `${format.toUpperCase()} estara disponible proximamente. Por ahora puedes usar JSON.`;
  }

  monthlyCellClass(cell: MonthlyCalendarCell): string {
    if (cell.kind !== 'day') {
      return 'is-empty';
    }

    if (cell.specialType) {
      return this.specialDateClass(cell.specialType);
    }

    if (cell.isWeekend) {
      return 'is-weekend';
    }

    if (cell.date && (this.monthlyView()?.suspendedDates ?? []).includes(cell.date)) {
      return 'is-suspension';
    }

    const selectedStudent = this.selectedMonthlyStudent();
    if (!selectedStudent) {
      const percentage = cell.globalPercentage;
      if (percentage == null) {
        return 'is-none';
      }
      if (percentage >= 80) {
        return 'is-global-good';
      }
      if (percentage >= 60) {
        return 'is-global-mid';
      }
      return 'is-global-bad';
    }

    switch (cell.individualStatus) {
      case 'PRESENTE':
        return 'is-present';
      case 'AUSENTE':
        return 'is-absent';
      case 'ATRASADO':
        return 'is-late';
      case 'SUSPENDIDO':
      case 'CLASES_SUSPENDIDAS':
        return 'is-suspension';
      default:
        return 'is-none';
    }
  }

  isMonthlyEditableCell(cell: MonthlyCalendarCell): boolean {
    return (
      cell.kind === 'day' &&
      !!this.selectedMonthlyStudent() &&
      !cell.specialType &&
      !cell.isWeekend &&
      !!cell.date &&
      !(this.monthlyView()?.suspendedDates ?? []).includes(cell.date)
    );
  }

  specialDateClass(type: AttendanceSpecialDateType): string {
    switch (type) {
      case 'VACACIONES':
        return 'is-vacation';
      case 'INTERFERIADO':
      case 'FERIADO':
        return 'is-holiday';
      default:
        return 'is-suspension';
    }
  }

  specialDateLabel(type: AttendanceSpecialDateType): string {
    switch (type) {
      case 'VACACIONES':
        return 'Vacaciones';
      case 'INTERFERIADO':
        return 'Interferiado';
      case 'FERIADO':
        return 'Feriado';
      default:
        return 'Suspension';
    }
  }

  specialDateShortLabel(type: AttendanceSpecialDateType): string {
    switch (type) {
      case 'VACACIONES':
        return 'V';
      case 'INTERFERIADO':
        return 'I';
      case 'FERIADO':
        return 'F';
      default:
        return 'S';
    }
  }

  initials(fullName: string): string {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value[0])
      .join('')
      .toUpperCase();
  }

  formatShortDate(value: string): string {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return value;
    }

    const [, year, month, day] = match;
    return `${day}/${month}/${year.slice(-2)}`;
  }

  trackStudent(index: number, student: { studentId: number }): number {
    return student.studentId;
  }

  selectedDateAsDate(): Date | null {
    const value = this.selectedDate();
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day);
  }

  private loadCatalog(): void {
    this.isLoading.set(true);
    this.attendanceApiService.getCatalog().subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        const schoolYear = this.defaultSchoolYear();
        this.selectedSchoolYear.set(schoolYear);
        this.selectedCourseId.set(this.firstCourseIdForSchoolYear(schoolYear));
        this.syncDateFiltersToSchoolYear(schoolYear);
        this.isLoading.set(false);
        this.loadActiveView();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el catálogo de asistencia');
      }
    });
  }

  private loadActiveView(): void {
    switch (this.activeTab()) {
      case 'daily':
        this.loadDailyView();
        break;
      case 'weekly':
        this.loadWeeklyView();
        break;
      case 'monthly':
        this.loadMonthlyView();
        break;
      case 'semester':
        this.loadSemesterView();
        break;
    }
  }

  private loadDailyView(): void {
    const courseId = this.selectedCourseId();
    if (!courseId) {
      this.clearAttendanceViews();
      return;
    }
    this.isLoading.set(true);
    this.attendanceApiService.getDaily(courseId, this.selectedDate()).subscribe({
      next: (view) => {
        this.dailyView.set(view);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el pase de lista');
      }
    });
  }

  private loadWeeklyView(): void {
    const courseId = this.selectedCourseId();
    if (!courseId) {
      this.clearAttendanceViews();
      return;
    }
    this.isLoading.set(true);
    this.attendanceApiService.getWeekly(courseId, this.selectedWeekStart()).subscribe({
      next: (view) => {
        this.weeklyView.set(view);
        this.weeklyStatusBaseline.set(this.buildWeeklyStatusBaseline(view));
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar la asistencia semanal');
      }
    });
  }

  private loadMonthlyView(): void {
    const courseId = this.selectedCourseId();
    if (!courseId) {
      this.clearAttendanceViews();
      return;
    }
    this.isLoading.set(true);
    this.attendanceApiService.getMonthly(courseId, this.selectedMonth()).subscribe({
      next: (view) => {
        this.monthlyView.set(view);
        this.monthlyStatusBaseline.set(this.buildMonthlyStatusBaseline(view));
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el resumen mensual');
      }
    });
  }

  private loadSemesterView(): void {
    const courseId = this.selectedCourseId();
    if (!courseId) {
      this.clearAttendanceViews();
      return;
    }

    this.isLoading.set(true);
    const semesterMonths = this.semesterMonths();
    const courseRankingRequests = this.coursesBySelectedYear().map((course) =>
      forkJoin(
        semesterMonths.map((month) =>
          this.attendanceApiService.getMonthly(course.id, month.value).pipe(catchError(() => of(null)))
        )
      ).pipe(map((views) => this.buildSemesterCourseHighlight(course.id, course.name, views.filter((view): view is MonthlyAttendanceView => !!view))))
    );

    forkJoin({
      selectedCourseViews: forkJoin(semesterMonths.map((month) => this.attendanceApiService.getMonthly(courseId, month.value))),
      courseHighlights: courseRankingRequests.length > 0 ? forkJoin(courseRankingRequests) : of([])
    }).subscribe({
      next: ({ selectedCourseViews, courseHighlights }) => {
        this.semesterViews.set(selectedCourseViews);
        this.semesterCourseHighlights.set(
          courseHighlights
            .filter((highlight): highlight is SemesterCourseAttendanceHighlight => highlight !== null)
            .sort((left, right) => right.percentage - left.percentage || left.courseName.localeCompare(right.courseName, 'es'))
        );
        const selectedStudentId = this.selectedSemesterStudentId();
        if (
          selectedStudentId !== 'all' &&
          !selectedCourseViews.some((view) => view.students.some((student) => student.studentId === selectedStudentId))
        ) {
          this.selectedSemesterStudentId.set('all');
        }
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el resumen semestral');
      }
    });
  }

  private loadAnnualView(): void {
    const courseId = this.selectedCourseId();
    const schoolYear = this.selectedCourse()?.schoolYear ?? this.selectedSchoolYear();
    if (!courseId) {
      this.annualViews.set([]);
      return;
    }

    this.isAnnualViewLoading.set(true);
    forkJoin(
      this.buildSchoolYearMonths(schoolYear).map((month) =>
        this.attendanceApiService.getMonthly(courseId, month).pipe(catchError(() => of(null)))
      )
    ).subscribe({
      next: (views) => {
        this.annualViews.set(
          views
            .filter((view): view is MonthlyAttendanceView => !!view)
            .sort((left, right) => this.parseMonthLabel(left.monthLabel) - this.parseMonthLabel(right.monthLabel))
        );
        this.isAnnualViewLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isAnnualViewLoading.set(false);
        this.showError(error, 'No fue posible cargar la vista anual de asistencia');
      }
    });
  }

  private clearAttendanceViews(): void {
    this.dailyView.set(null);
    this.weeklyView.set(null);
    this.monthlyView.set(null);
    this.semesterViews.set([]);
    this.semesterCourseHighlights.set([]);
    this.weeklyStatusBaseline.set(new Map());
    this.monthlyStatusBaseline.set(new Map());
    this.isLoading.set(false);
  }

  private buildWeeklyStatusBaseline(view: WeeklyAttendanceView): Map<string, string> {
    const baseline = new Map<string, string>();
    for (const student of view.students) {
      for (const day of student.days) {
        baseline.set(this.weeklyStatusKey(student.studentId, day.date), day.status || 'SIN_MARCAR');
      }
    }
    return baseline;
  }

  private buildMonthlyStatusBaseline(view: MonthlyAttendanceView): Map<string, string> {
    const baseline = new Map<string, string>();
    for (const student of view.students) {
      for (const day of student.days) {
        baseline.set(this.monthlyStatusKey(student.studentId, day.date), day.status || 'SIN_MARCAR');
      }
    }
    return baseline;
  }

  private weeklyStatusKey(studentId: number, date: string): string {
    return `${studentId}|${date}`;
  }

  private monthlyStatusKey(studentId: number, date: string): string {
    return `${studentId}|${date}`;
  }

  isWeeklyEditableStatus(status: string): boolean {
    return status !== 'CLASES_SUSPENDIDAS';
  }

  private nextInlineAttendanceStatus(status: string): AttendanceStatus {
    switch (status) {
      case 'PRESENTE':
        return 'AUSENTE';
      case 'AUSENTE':
        return 'SIN_MARCAR';
      default:
        return 'PRESENTE';
    }
  }

  private recalculateWeekly(view: WeeklyAttendanceView, students: WeeklyAttendanceView['students']): WeeklyAttendanceView {
    const nextStudents = students.map((student) => {
      const editableDays = student.days.filter((day) => this.isWeeklyEditableStatus(day.status));
      const totalDays = editableDays.length;
      const presentCount = editableDays.filter((day) => day.status === 'PRESENTE').length;
      const absentCount = editableDays.filter((day) => day.status === 'AUSENTE').length;
      const lateCount = editableDays.filter((day) => day.status === 'ATRASADO').length;
      const attendanceLike = presentCount + lateCount;

      return {
        ...student,
        absences: absentCount,
        lateCount,
        attendancePercentage: totalDays > 0 ? Math.round((attendanceLike * 100) / totalDays) : 0,
        statusBadge: this.resolveSemesterRisk(absentCount, lateCount)
      };
    });

    const totalAbsences = nextStudents.reduce((sum, student) => sum + student.absences, 0);
    const totalLate = nextStudents.reduce((sum, student) => sum + student.lateCount, 0);
    const averageAttendance =
      nextStudents.length > 0
        ? Math.round(
            nextStudents.reduce((sum, student) => sum + student.attendancePercentage, 0) / nextStudents.length
          )
        : 0;

    return {
      ...view,
      students: nextStudents,
      summary: {
        averageAttendance,
        totalAbsences,
        totalLate,
        activeAlerts: view.alerts.length
      }
    };
  }

  private recalculateMonthlyStudent(
    student: MonthlyAttendanceStudent,
    schoolDays: number
  ): MonthlyAttendanceStudent {
    const presentCount = student.days.filter((day) => day.status === 'PRESENTE').length;
    const absentCount = student.days.filter((day) => day.status === 'AUSENTE').length;
    const lateCount = student.days.filter((day) => day.status === 'ATRASADO').length;
    const denominator = Math.max(1, schoolDays);

    return {
      ...student,
      presentCount,
      absentCount,
      lateCount,
      presentPercentage: Math.round((presentCount * 100) / denominator),
      absentPercentage: Math.round((absentCount * 100) / denominator),
      latePercentage: Math.round((lateCount * 100) / denominator),
      riskStatus: this.resolveSemesterRisk(absentCount, lateCount)
    };
  }

  private buildMonthlyStudentDaysFromBaseline(studentId: number): { date: string; status: string }[] {
    const prefix = `${studentId}|`;
    return Array.from(this.monthlyStatusBaseline().entries())
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, status]) => ({ date: key.slice(prefix.length), status }))
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  private persistInlineAttendanceChanges(
    changesByDate: Map<string, Map<number, AttendanceStatus>>,
    successMessage: string
  ): void {
    const courseId = this.selectedCourseId();
    if (!courseId || this.isSaving()) {
      return;
    }

    if (changesByDate.size === 0) {
      this.snackBar.open('No hay cambios pendientes para guardar', 'Cerrar', { duration: 2400 });
      return;
    }

    this.isSaving.set(true);
    forkJoin(
      Array.from(changesByDate.entries()).map(([date, studentChanges]) =>
        this.attendanceApiService.getDaily(courseId, date).pipe(
          switchMap((dailyView) =>
            this.attendanceApiService.saveDaily({
              courseId,
              date,
              classSuspended: dailyView.classSuspended,
              suspensionReason: dailyView.suspensionMessage,
              entries: dailyView.students.map((student) => {
                const nextStatus = studentChanges.get(student.studentId) ?? (student.status as AttendanceStatus);
                return {
                  studentId: student.studentId,
                  status: nextStatus,
                  arrivalTime: nextStatus === 'ATRASADO' ? student.arrivalTime || this.defaultArrivalTime() : null,
                  note: student.note,
                  departureTime: student.departureTime,
                  departureReason: student.departureReason,
                  departureJustified: student.departureJustified,
                  departureNote: student.departureNote
                };
              })
            })
          )
        )
      )
    ).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.snackBar.open(successMessage, 'Cerrar', { duration: 2600 });
        this.loadDailyView();
        this.loadWeeklyView();
        this.loadMonthlyView();
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(error, 'No fue posible guardar la asistencia');
      }
    });
  }

  private firstCourseIdForSchoolYear(schoolYear: number): number | null {
    return this.orderedCourses().find((course) => course.schoolYear === schoolYear)?.id ?? null;
  }

  private buildSemesterCourseHighlight(
    courseId: number,
    courseName: string,
    views: MonthlyAttendanceView[]
  ): SemesterCourseAttendanceHighlight | null {
    if (views.length === 0) {
      return null;
    }

    const totalSchoolDays = views.reduce((sum, view) => sum + (view.schoolDays ?? 0), 0);
    if (totalSchoolDays <= 0) {
      return null;
    }

    const students = new Map<number, { studentName: string; studentRun: string; attendanceLike: number }>();
    for (const view of views) {
      for (const student of view.students) {
        const current =
          students.get(student.studentId) ??
          {
            studentName: student.fullName,
            studentRun: student.run,
            attendanceLike: 0
          };

        current.attendanceLike += student.presentCount + student.lateCount;
        students.set(student.studentId, current);
      }
    }

    let bestHighlight: SemesterCourseAttendanceHighlight | null = null;
    for (const student of students.values()) {
      const percentage = Math.round((student.attendanceLike * 100) / totalSchoolDays);
      if (
        !bestHighlight ||
        percentage > bestHighlight.percentage ||
        (percentage === bestHighlight.percentage && student.studentName.localeCompare(bestHighlight.studentName, 'es') < 0)
      ) {
        bestHighlight = {
          courseId,
          courseName,
          studentName: student.studentName,
          studentRun: student.studentRun,
          percentage
        };
      }
    }

    return bestHighlight;
  }

  private syncDateFiltersToSchoolYear(schoolYear: number): void {
    const currentDate = this.parseLocalDate(this.selectedDate());
    const date = Number.isNaN(currentDate.getTime()) ? new Date(schoolYear, 0, 1) : currentDate;
    date.setFullYear(schoolYear);

    const currentWeekStart = this.startOfWeek(date);
    const currentMonth = this.selectedMonth().split('-')[1] ?? `${date.getMonth() + 1}`.padStart(2, '0');

    this.selectedDate.set(this.toIsoDate(date));
    this.selectedWeekStart.set(this.toIsoDate(currentWeekStart));
    this.selectedMonth.set(`${schoolYear}-${currentMonth}`);
  }

  private buildSemesterCalendarMonth(
    view: MonthlyAttendanceView,
    selectedStudentDaysOverride?: Map<string, string> | null
  ): SemesterCalendarMonth {
    const monthMatch = view.monthLabel.match(/\b(20\d{2})\b/);
    const year = monthMatch ? Number(monthMatch[1]) : this.selectedCourse()?.schoolYear ?? this.selectedSchoolYear();
    const month = this.parseMonthLabel(view.monthLabel);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1);
    const firstWeekOffset = (firstDay.getDay() + 6) % 7;
    const selectedStudent = selectedStudentDaysOverride ? true : !!this.selectedSemesterStudent();
    const daySummary = new Map(view.dailySummary.map((day) => [Number(day.dayLabel), day.attendancePercentage]));
    const dayStatusSummary = this.buildSemesterDayStatusSummary(view);
    const studentDays = selectedStudentDaysOverride ?? this.selectedSemesterStudent()?.days ?? new Map<string, string>();
    const suspendedDates = new Set(view.suspendedDates ?? []);
    const specialDates = new Map(
      (view.specialDates ?? []).map((specialDate) => [specialDate.date, specialDate])
    );
    const label = new Intl.DateTimeFormat('es-CL', { month: 'long' })
      .format(new Date(year, month - 1, 1))
      .replace(/^\w/, (char) => char.toUpperCase());
    const weeks = new Map<number, { weekKey: string; cells: SemesterCalendarCell[] }>();

    for (let day = 1; day <= daysInMonth; day++) {
      const current = new Date(year, month - 1, day);
      const weekday = current.getDay();
      if (weekday === 0 || weekday === 6) {
        continue;
      }

      const weekIndex = Math.floor((firstWeekOffset + day - 1) / 7);
      const isoDate = this.toIsoDate(current);
      const weekdayIndex = weekday - 1;
      const week =
        weeks.get(weekIndex) ??
        {
          weekKey: `${label}-${weekIndex}`,
          cells: Array.from({ length: 5 }, () => ({ dayNumber: null, specialMarker: null, statusClass: 'is-empty', statusLabel: '' }))
        };

      let statusClass = 'semester-none';
      let statusLabel = 'Sin clases';
      let specialMarker: string | null = null;
      const specialDate = specialDates.get(isoDate);

      if (specialDate) {
        statusClass = this.semesterSpecialDateClass(specialDate.type as AttendanceSpecialDateType);
        statusLabel = specialDate.label || this.specialDateLabel(specialDate.type as AttendanceSpecialDateType);
        specialMarker = this.specialDateShortLabel(specialDate.type as AttendanceSpecialDateType);
      } else if (suspendedDates.has(isoDate)) {
        statusClass = 'semester-suspension';
        statusLabel = 'Clases suspendidas';
        specialMarker = 'S';
      } else if (selectedStudent) {
        const status = studentDays.get(isoDate);
        statusClass = this.semesterStudentStatusClass(status);
        statusLabel = status ? this.statusLabel(status) : 'Sin clases';
      } else {
        const dayStatus = dayStatusSummary.get(isoDate);
        if (dayStatus) {
          statusClass = dayStatus.statusClass;
          statusLabel = dayStatus.statusLabel;
        } else {
          const percentage = daySummary.get(day);
          statusClass = this.semesterPercentageClass(percentage);
          statusLabel = percentage == null ? 'Sin clases' : `${percentage}% asistencia`;
        }
      }

      week.cells[weekdayIndex] = {
        dayNumber: day,
        specialMarker,
        statusClass,
        statusLabel
      };

      weeks.set(weekIndex, week);
    }

    return {
      month,
      label,
      weeks: Array.from(weeks.values())
    };
  }

  private buildSemesterDayStatusSummary(
    view: MonthlyAttendanceView
  ): Map<string, { statusClass: string; statusLabel: string }> {
    const summary = new Map<string, { present: number; late: number; absent: number; suspended: number }>();

    for (const student of view.students) {
      for (const day of student.days) {
        const current = summary.get(day.date) ?? { present: 0, late: 0, absent: 0, suspended: 0 };
        switch (day.status) {
          case 'PRESENTE':
            current.present += 1;
            break;
          case 'ATRASADO':
            current.late += 1;
            break;
          case 'AUSENTE':
            current.absent += 1;
            break;
          case 'SUSPENDIDO':
          case 'CLASES_SUSPENDIDAS':
            current.suspended += 1;
            break;
          default:
            break;
        }
        summary.set(day.date, current);
      }
    }

    return new Map(
      Array.from(summary.entries()).map(([date, counts]) => {
        if (counts.late > 0) {
          return [date, { statusClass: 'semester-late', statusLabel: `${counts.late} atraso(s) registrado(s)` }];
        }
        if (counts.absent > 0 || counts.suspended > 0) {
          return [
            date,
            {
              statusClass: 'semester-absent',
              statusLabel: `${counts.absent + counts.suspended} inasistencia(s) o suspension(es)`
            }
          ];
        }
        if (counts.present > 0) {
          return [date, { statusClass: 'semester-present', statusLabel: `${counts.present} asistencia(s) registrada(s)` }];
        }
        return [date, { statusClass: 'semester-none', statusLabel: 'Sin clases' }];
      })
    );
  }

  private semesterPercentageClass(percentage: number | null | undefined): string {
    if (percentage == null) {
      return 'semester-none';
    }
    if (percentage >= 80) {
      return 'semester-present';
    }
    if (percentage >= 60) {
      return 'semester-late';
    }
    return 'semester-absent';
  }

  private semesterStudentStatusClass(status: string | undefined): string {
    switch (status) {
      case 'PRESENTE':
        return 'semester-present';
      case 'ATRASADO':
        return 'semester-late';
      case 'AUSENTE':
        return 'semester-absent';
      case 'SUSPENDIDO':
      case 'CLASES_SUSPENDIDAS':
        return 'semester-suspension';
      default:
        return 'semester-none';
    }
  }

  private semesterSpecialDateClass(type: AttendanceSpecialDateType): string {
    switch (type) {
      case 'VACACIONES':
        return 'semester-vacation';
      case 'INTERFERIADO':
      case 'FERIADO':
        return 'semester-holiday';
      default:
        return 'semester-suspension';
    }
  }

  private semesterMonthTone(percentage: number): 'success' | 'warning' | 'danger' {
    if (percentage >= 80) {
      return 'success';
    }
    if (percentage >= 60) {
      return 'warning';
    }
    return 'danger';
  }

  private resolveSemesterRisk(absentCount: number, lateCount: number): string {
    if (absentCount >= 4 || lateCount >= 5) {
      return 'CRITICO';
    }
    if (absentCount >= 2 || lateCount >= 3) {
      return 'RIESGO';
    }
    return 'NORMAL';
  }

  private parseMonthLabel(monthLabel: string): number {
    const normalized = monthLabel
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const index = months.findIndex((month) => normalized.includes(month));
    return index >= 0 ? index + 1 : 1;
  }

  private recalculateDaily(view: DailyAttendanceView, students: DailyAttendanceStudent[]): DailyAttendanceView {
    const presentCount = students.filter((student) => student.status === 'PRESENTE').length;
    const absentCount = students.filter((student) => student.status === 'AUSENTE').length;
    const lateCount = students.filter((student) => student.status === 'ATRASADO').length;
    const suspendedCount = students.filter((student) => student.status === 'SUSPENDIDO').length;
    const totalStudents = students.length;
    const markedCount = view.classSuspended ? 0 : presentCount + absentCount + lateCount + suspendedCount;

    return {
      ...view,
      students,
      totalStudents,
      presentCount: view.classSuspended ? 0 : presentCount,
      absentCount: view.classSuspended ? 0 : absentCount,
      lateCount: view.classSuspended ? 0 : lateCount,
      summary: {
        markedCount,
        progressPercent: view.classSuspended ? 0 : totalStudents > 0 ? Math.round((markedCount / totalStudents) * 100) : 0,
        presentPercentage: view.classSuspended ? 0 : totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0,
        absentPercentage: view.classSuspended ? 0 : totalStudents > 0 ? Math.round((absentCount / totalStudents) * 100) : 0,
        latePercentage: view.classSuspended ? 0 : totalStudents > 0 ? Math.round((lateCount / totalStudents) * 100) : 0
      }
    };
  }

  private persistClassSuspension(classSuspended: boolean, suspensionReason: string | null): void {
    const current = this.dailyView();
    const courseId = this.selectedCourseId();
    if (!current || !courseId || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.attendanceApiService
      .saveDaily({
        courseId,
        date: this.selectedDate(),
        classSuspended,
        suspensionReason,
        entries: current.students.map((student) => ({
          studentId: student.studentId,
          status: student.status,
          arrivalTime: student.arrivalTime,
          note: student.note,
          departureTime: student.departureTime,
          departureReason: student.departureReason,
          departureJustified: student.departureJustified,
          departureNote: student.departureNote
        }))
      })
      .subscribe({
        next: (view) => {
          this.dailyView.set(view);
          this.isSaving.set(false);
          this.snackBar.open(
            classSuspended
              ? 'La jornada quedó marcada como clases suspendidas'
              : 'La jornada volvió a estar habilitada',
            'Cerrar',
            { duration: 2800 }
          );
          this.loadWeeklyView();
          this.loadMonthlyView();
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.showError(error, 'No fue posible actualizar la suspensión de clases');
        }
      });
  }

  private buildDailySavePayload(courseId: number, view: DailyAttendanceView) {
    return {
      courseId,
      date: this.selectedDate(),
      classSuspended: view.classSuspended,
      suspensionReason: view.suspensionMessage,
      entries: view.students.map((student) => ({
        studentId: student.studentId,
        status: student.status,
        arrivalTime: student.arrivalTime,
        note: student.note,
        departureTime: student.departureTime,
        departureReason: student.departureReason,
        departureJustified: student.departureJustified,
        departureNote: student.departureNote
      }))
    };
  }

  private defaultArrivalTime(): string {
    return '08:40';
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(
      typeof error.error?.message === 'string' ? error.error.message : fallback,
      'Cerrar',
      { duration: 3500 }
    );
  }

  private startOfWeek(date: Date): Date {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    return copy;
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseLocalDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year || this.currentSchoolYear, (month || 1) - 1, day || 1);
  }

  private defaultSchoolYear(): number {
    return this.schoolYears.includes(this.currentSchoolYear as typeof this.schoolYears[number])
      ? this.currentSchoolYear
      : this.schoolYears[0];
  }

  private toYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private buildCurrentJsonExportPayload(): unknown | null {
    const course = this.selectedCourse();
    const basePayload = {
      generatedAt: new Date().toISOString(),
      generatedBy: this.user()?.nombre ?? 'Usuario',
      tab: this.activeTab(),
      course: course ? { id: course.id, name: course.name, schoolYear: course.schoolYear } : null
    };

    if (this.activeTab() === 'daily') {
      const dailyView = this.dailyView();
      if (!dailyView) {
        return null;
      }

      return {
        ...basePayload,
        filters: {
          date: this.selectedDate(),
          search: this.dailySearch().trim()
        },
        attendance: dailyView
      };
    }

    if (this.activeTab() === 'weekly') {
      const weeklyView = this.weeklyView();
      if (!weeklyView) {
        return null;
      }

      return {
        ...basePayload,
        filters: {
          startDate: this.selectedWeekStart()
        },
        attendance: weeklyView
      };
    }

    if (this.activeTab() === 'monthly') {
      const monthlyView = this.monthlyView();
      if (!monthlyView) {
        return null;
      }

      return {
        ...basePayload,
        filters: {
          month: this.selectedMonth(),
          search: this.monthlySearch().trim(),
          selectedStudentId: this.selectedMonthlyStudentId()
        },
        attendance: monthlyView,
        selectedStudent: this.selectedMonthlyStudent()
      };
    }

    const semesterViews = this.semesterViews();
    if (semesterViews.length === 0) {
      return null;
    }

    return {
      ...basePayload,
      filters: {
        semester: this.selectedSemester(),
        selectedStudentId: this.selectedSemesterStudentId()
      },
      attendance: semesterViews,
      selectedStudent: this.selectedSemesterStudent()
    };
  }

  private buildSchoolYearMonths(schoolYear: number): string[] {
    return Array.from({ length: 12 }, (_, index) => {
      const month = `${index + 1}`.padStart(2, '0');
      return `${schoolYear}-${month}`;
    });
  }

  private downloadJsonFile(payload: unknown): void {
    const fileName = this.buildExportFileName();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private buildExportFileName(): string {
    const now = new Date();
    const date = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
    const tab = this.activeTab();
    return `asistencia-${tab}-${date}.json`;
  }
}
