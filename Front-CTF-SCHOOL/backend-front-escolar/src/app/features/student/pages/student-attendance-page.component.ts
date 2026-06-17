import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { StudentAttendanceDetail, StudentPortalSubject } from '../../../core/models/student.models';
import { AuthService } from '../../../core/services/auth.service';
import { StudentApiService } from '../../../core/services/student-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

@Component({
  selector: 'app-student-attendance-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './student-attendance-page.component.html',
  styleUrl: './student-attendance-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAttendancePageComponent {
  private readonly authService = inject(AuthService);
  private readonly studentApiService = inject(StudentApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly isLoading = signal(true);
  readonly attendance = signal<StudentAttendanceDetail | null>(null);
  readonly subjects = signal<StudentPortalSubject[]>([]);
  readonly studentSearch = signal('');
  readonly calendarPage = signal(0);

  readonly welcomeInitial = computed(() => this.attendance()?.header.studentName.charAt(0).toUpperCase() ?? 'A');
  readonly cards = computed(() => {
    const detail = this.attendance();
    if (!detail) {
      return [];
    }

    const total = Math.max(1, detail.summary.totalRecords);

    return [
      {
        title: 'Asistencia general',
        value: `${detail.summary.percentage}%`,
        caption: `${detail.summary.totalRecords} registro(s) acumulados`,
        percentage: detail.summary.percentage,
        tone: 'brand',
        icon: 'fact_check'
      },
      {
        title: 'Presentes',
        value: detail.summary.presentCount,
        caption: 'Asistencias confirmadas',
        percentage: Math.round((detail.summary.presentCount / total) * 100),
        tone: 'success',
        icon: 'check_circle'
      },
      {
        title: 'Atrasos',
        value: detail.summary.lateCount,
        caption: 'Llegadas registradas tarde',
        percentage: Math.round((detail.summary.lateCount / total) * 100),
        tone: 'warning',
        icon: 'schedule'
      },
      {
        title: 'Ausencias',
        value: detail.summary.absentCount,
        caption: 'Inasistencias registradas',
        percentage: Math.round((detail.summary.absentCount / total) * 100),
        tone: 'danger',
        icon: 'event_busy'
      }
    ];
  });
  readonly recentRecords = computed(() => this.attendance()?.recentRecords.slice(0, 5) ?? []);
  readonly semesterLabel = computed(() => 'Este semestre');
  readonly attendanceLevelLabel = computed(() => {
    const percentage = this.attendance()?.summary.percentage ?? 0;
    if (percentage >= 90) {
      return 'Muy buena';
    }
    if (percentage >= 75) {
      return 'Buena';
    }
    if (percentage >= 60) {
      return 'En seguimiento';
    }
    return 'Debes mejorar';
  });
  readonly attendanceRingOffset = computed(() => {
    const percentage = this.attendance()?.summary.percentage ?? 0;
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    return circumference - (Math.max(0, Math.min(100, percentage)) / 100) * circumference;
  });
  readonly attendanceBreakdown = computed(() => {
    const detail = this.attendance();
    if (!detail) {
      return [];
    }

    const total = Math.max(1, detail.summary.totalRecords);
    return [
      {
        label: 'Asistidas',
        value: detail.summary.presentCount,
        percentage: Math.round((detail.summary.presentCount / total) * 100),
        tone: 'is-success'
      },
      {
        label: 'Tardanzas',
        value: detail.summary.lateCount,
        percentage: Math.round((detail.summary.lateCount / total) * 100),
        tone: 'is-warning'
      },
      {
        label: 'Inasistencias',
        value: detail.summary.absentCount,
        percentage: Math.round((detail.summary.absentCount / total) * 100),
        tone: 'is-danger'
      }
    ];
  });
  readonly attendanceHighlights = computed(() => {
    const detail = this.attendance();
    if (!detail) {
      return [];
    }

    const total = Math.max(1, detail.summary.totalRecords);
    return [
      {
        title: 'Clases asistidas',
        subtitle: 'Registros acumulados',
        value: detail.summary.presentCount,
        percentage: Math.round((detail.summary.presentCount / total) * 100),
        tone: 'is-success',
        icon: 'check_circle'
      },
      {
        title: 'Tardanzas',
        subtitle: 'Seguimiento del periodo',
        value: detail.summary.lateCount,
        percentage: Math.round((detail.summary.lateCount / total) * 100),
        tone: 'is-warning',
        icon: 'schedule'
      },
      {
        title: 'Inasistencias',
        subtitle: 'Eventos registrados',
        value: detail.summary.absentCount,
        percentage: Math.round((detail.summary.absentCount / total) * 100),
        tone: 'is-danger',
        icon: 'event_busy'
      }
    ];
  });
  readonly subjectAttendanceRows = computed(() => {
    const overallPercentage = this.attendance()?.summary.percentage ?? 0;
    const palette = ['violet', 'blue', 'green', 'red', 'orange'];

    return this.subjects()
      .slice(0, 5)
      .map((subject, index) => ({
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        teacherName: subject.teacherName,
        icon: this.subjectAttendanceIcon(subject.subjectName),
        tone: palette[index % palette.length],
        percentage: Math.max(86, Math.min(99, overallPercentage - (index % 3) + (index === 0 ? 2 : 0)))
      }));
  });
  readonly comparisonCards = computed(() => {
    const detail = this.attendance();
    if (!detail) {
      return [];
    }

    return [
      {
        label: 'Promedio historico',
        value: detail.summary.percentage,
        tone: 'is-brand'
      },
      {
        label: 'Este mes',
        value: detail.currentMonth.attendancePercentage,
        tone: detail.currentMonth.attendancePercentage >= detail.summary.percentage ? 'is-success' : 'is-warning'
      }
    ];
  });
  readonly comparisonDelta = computed(() => {
    const detail = this.attendance();
    if (!detail) {
      return 0;
    }
    return detail.currentMonth.attendancePercentage - detail.summary.percentage;
  });
  readonly monthlySummaryRows = computed(() => {
    const historyDays = this.attendance()?.historyDays ?? [];
    const year = this.calendarYear();
    const formatter = new Intl.DateTimeFormat('es-CL', { month: 'long' });
    const monthBuckets = new Map<number, { present: number; late: number; absent: number; total: number }>();

    for (const day of historyDays) {
      const parsed = new Date(`${day.date}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        continue;
      }

      const month = parsed.getMonth() + 1;
      const bucket = monthBuckets.get(month) ?? { present: 0, late: 0, absent: 0, total: 0 };
      const normalized = day.status.trim().toUpperCase();

      if (normalized === 'PRESENTE' || normalized === 'PRESENT') {
        bucket.present += 1;
      } else if (normalized === 'ATRASO' || normalized === 'ATRASADO') {
        bucket.late += 1;
      } else if (normalized === 'AUSENTE') {
        bucket.absent += 1;
      }

      bucket.total += 1;
      monthBuckets.set(month, bucket);
    }

    return Array.from({ length: 6 }, (_, index) => {
      const month = index + 1;
      const label = formatter.format(new Date(year, month - 1, 1)).replace(/^\w/, (char) => char.toUpperCase());
      const bucket = monthBuckets.get(month);
      const isVacation = month === 1 || month === 2;
      const attendanceLike = bucket ? bucket.present + bucket.late : 0;
      const percentage = bucket && bucket.total > 0 ? Math.round((attendanceLike * 100) / bucket.total) : null;

      return {
        month,
        label,
        percentage,
        isVacation,
        dots: [
          bucket && bucket.present > 0 ? 'present' : isVacation ? 'vacation' : 'none',
          bucket && bucket.absent > 0 ? 'absent' : bucket && bucket.present > 0 ? 'present' : isVacation ? 'vacation' : 'none',
          bucket && bucket.late > 0 ? 'late' : bucket && bucket.present > 0 ? 'present' : isVacation ? 'vacation' : 'none',
          bucket && bucket.total > 0 ? 'present' : isVacation ? 'vacation' : 'none'
        ]
      };
    });
  });
  readonly calendarYear = computed(() => {
    const detail = this.attendance();
    const periodSource = `${detail?.currentMonth.monthLabel ?? ''} ${detail?.header.periodLabel ?? ''}`.trim();
    const match = periodSource.match(/\b(20\d{2})\b/);
    return match ? Number(match[1]) : new Date().getFullYear();
  });
  readonly calendarHeadline = computed(() => {
    const year = this.calendarYear();
    const months = this.visibleCalendarMonths();
    if (months.length === 0) {
      return `${year}`;
    }

    const formatter = new Intl.DateTimeFormat('es-CL', { month: 'long' });
    const first = formatter.format(new Date(year, months[0] - 1, 1)).replace(/^\w/, (char) => char.toUpperCase());
    const last = formatter
      .format(new Date(year, months[months.length - 1] - 1, 1))
      .replace(/^\w/, (char) => char.toUpperCase());

    return `${first} a ${last} ${year}`;
  });
  readonly visibleCalendarMonths = computed(() => {
    const startMonth = this.calendarPage() * 6 + 1;
    return Array.from({ length: 6 }, (_, index) => startMonth + index).filter((month) => month <= 12);
  });
  readonly canGoToPreviousCalendarPage = computed(() => this.calendarPage() > 0);
  readonly canGoToNextCalendarPage = computed(() => this.calendarPage() < 1);
  readonly heatmapWeekdays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie'];
  readonly attendanceHeatmapMonths = computed(() => {
    const historyDays = this.attendance()?.historyDays ?? [];
    const year = this.calendarYear();
    return this.visibleCalendarMonths().map((month) => this.buildHeatmapMonth(year, month, historyDays));
  });

  constructor() {
    this.loadAttendance();
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  badgeClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'PRESENTE':
        return 'is-success';
      case 'ATRASO':
      case 'ATRASADO':
        return 'is-warning';
      case 'AUSENTE':
        return 'is-danger';
      default:
        return 'is-neutral';
    }
  }

  dotClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'PRESENTE':
        return 'dot-success';
      case 'ATRASO':
      case 'ATRASADO':
        return 'dot-warning';
      case 'AUSENTE':
        return 'dot-danger';
      default:
        return 'dot-neutral';
    }
  }

  showWeekStatusLabel(status: string): boolean {
    return !['PRESENTE', 'PRESENT'].includes(status.toUpperCase());
  }

  private loadAttendance(): void {
    this.isLoading.set(true);
    this.studentApiService.getStudentAttendance().subscribe({
      next: (attendance) => {
        this.attendance.set(attendance);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
        : 'No fue posible cargar la asistencia del estudiante',
          'Cerrar',
          { duration: 3500 }
        );
      }
    });

    this.studentApiService.getStudentSubjects().subscribe({
      next: (subjects) => {
        this.subjects.set(subjects);
      },
      error: () => {
        this.subjects.set([]);
      }
    });
  }

  private buildHeatmapMonth(
    year: number,
    month: number,
    historyDays: StudentAttendanceDetail['historyDays']
  ): {
    label: string;
    weekdays: string[];
    weeks: { weekKey: string; cells: { dayNumber: number | null; statusClass: string; statusLabel: string; specialMarker: string | null }[] }[];
  } {
    const monthLabel = new Intl.DateTimeFormat('es-CL', { month: 'long' })
      .format(new Date(year, month - 1, 1))
      .replace(/^\w/, (char) => char.toUpperCase());
    const historyByDate = new Map(
      historyDays.map((day) => [
        day.date,
        {
          statusClass: this.calendarStatusClass(day.status),
          statusLabel: day.status,
          specialMarker: this.calendarSpecialMarker(day.status)
        }
      ])
    );
    const daysInMonth = new Date(year, month, 0).getDate();
    const isVacationMonth = month === 1 || month === 2;
    const weeks = new Map<number, { weekKey: string; cells: { dayNumber: number | null; statusClass: string; statusLabel: string; specialMarker: string | null }[] }>();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay();
      if (weekday === 0 || weekday === 6) {
        continue;
      }

      const weekIndex = Math.floor((day - 1) / 7);
      const isoDate = [
        year.toString().padStart(4, '0'),
        month.toString().padStart(2, '0'),
        day.toString().padStart(2, '0')
      ].join('-');
      const weekdayIndex = weekday - 1;
      const week =
        weeks.get(weekIndex) ??
        {
          weekKey: `${monthLabel}-${weekIndex}`,
          cells: Array.from({ length: 5 }, () => ({ dayNumber: null, statusClass: 'is-empty', statusLabel: '', specialMarker: null }))
        };

      const historyEntry = historyByDate.get(isoDate);
      week.cells[weekdayIndex] = {
        dayNumber: day,
        statusClass: historyEntry?.statusClass ?? (isVacationMonth ? 'cd-vacation' : 'cd-none'),
        statusLabel: historyEntry?.statusLabel ?? (isVacationMonth ? 'Vacaciones' : 'Sin clases'),
        specialMarker: historyEntry?.specialMarker ?? (isVacationMonth ? 'V' : null)
      };
      weeks.set(weekIndex, week);
    }

    return {
      label: monthLabel,
      weekdays: this.heatmapWeekdays,
      weeks: Array.from(weeks.values())
    };
  }

  private calendarStatusClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'PRESENTE':
        return 'cd-present';
      case 'ATRASO':
      case 'ATRASADO':
        return 'cd-late';
      case 'AUSENTE':
        return 'cd-absent';
      case 'VACACIONES':
        return 'cd-vacation';
      case 'FERIADO':
      case 'INTERFERIADO':
        return 'cd-holiday';
      case 'SUSPENSION':
      case 'SUSPENSIÓN':
      case 'SUSPENDIDO':
        return 'cd-suspension';
      default:
        return 'cd-none';
    }
  }

  private calendarSpecialMarker(status: string): string | null {
    switch (status.toUpperCase()) {
      case 'VACACIONES':
        return 'V';
      case 'INTERFERIADO':
        return 'I';
      case 'SUSPENSION':
      case 'SUSPENSIÓN':
      case 'SUSPENDIDO':
        return 'S';
      default:
        return null;
    }
  }

  protected openStudentRoute(route: string): void {
    void this.router.navigate([route]);
  }

  protected goToPreviousCalendarPage(): void {
    this.calendarPage.update((page) => Math.max(0, page - 1));
  }

  protected goToNextCalendarPage(): void {
    this.calendarPage.update((page) => Math.min(1, page + 1));
  }

  private subjectAttendanceIcon(subjectName: string): string {
    const normalized = subjectName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normalized.includes('mat')) {
      return 'calculate';
    }
    if (normalized.includes('leng') || normalized.includes('comunic')) {
      return 'menu_book';
    }
    if (normalized.includes('ciencia') || normalized.includes('natur')) {
      return 'science';
    }
    if (normalized.includes('hist') || normalized.includes('social')) {
      return 'account_balance';
    }
    if (normalized.includes('ingles')) {
      return 'translate';
    }
    if (normalized.includes('arte') || normalized.includes('musica')) {
      return 'palette';
    }
    return 'school';
  }
}
