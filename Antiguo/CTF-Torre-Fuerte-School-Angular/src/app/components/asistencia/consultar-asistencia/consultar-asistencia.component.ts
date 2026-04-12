import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface AttendanceStats {
  totalClasses: number;
  averageAttendance: number;
  averageLate: number;
  averageAbsent: number;
}

interface CourseData {
  id: string;
  name: string;
  attendanceData: any[];
}

interface Student {
  id: number;
  name: string;
  avatar: string;
  totalClasses: number;
  absences: number;
  absencePercentage: number;
}

@Component({
  selector: 'app-consultar-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consultar-asistencia.component.html',
  styleUrls: ['./consultar-asistencia.component.css']
})
export class ConsultarAsistenciaComponent implements OnInit {
  // Filtros
  selectedCourse: string = '';
  selectedMonth: string = '2025-12';
  searchTerm: string = '';

  // Datos de estadísticas
  stats: AttendanceStats = {
    totalClasses: 156,
    averageAttendance: 89,
    averageLate: 7,
    averageAbsent: 4
  };

  // Datos de calendario
  attendanceData: any = {
    '2025-12-01': { courseId: 1, present: 22, late: 2, absent: 1 },
    '2025-12-02': { courseId: 1, present: 23, late: 1, absent: 1 },
    '2025-12-03': { courseId: 1, present: 24, late: 1, absent: 0 },
    '2025-12-04': { courseId: 1, present: 21, late: 3, absent: 1 },
    '2025-12-05': { courseId: 1, present: 20, late: 2, absent: 3 },
    '2025-12-06': { courseId: 1, present: 22, late: 2, absent: 1 },
    '2025-12-07': { courseId: 1, present: 23, late: 1, absent: 1 },
    '2025-12-08': { courseId: 1, present: 24, late: 0, absent: 1 },
    '2025-12-09': { courseId: 1, present: 22, late: 2, absent: 1 },
    '2025-12-10': { courseId: 1, present: 23, late: 1, absent: 1 }
  };

  // Estudiantes con mayor ausentismo
  absenteeStudents: Student[] = [
    { id: 1, name: 'Luis Soto', avatar: 'https://i.pravatar.cc/32?img=3', totalClasses: 45, absences: 12, absencePercentage: 26.7 },
    { id: 2, name: 'María Jara', avatar: 'https://i.pravatar.cc/32?img=2', totalClasses: 45, absences: 8, absencePercentage: 17.8 },
    { id: 3, name: 'Ana Martínez', avatar: 'https://i.pravatar.cc/32?img=4', totalClasses: 42, absences: 7, absencePercentage: 16.7 }
  ];

  // Datos para gráfico de tendencias
  trendData = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    present: [22, 23, 24, 21, 20, 22, 23],
    absent: [1, 1, 0, 1, 3, 1, 1]
  };

  // Menú de opciones de asistencia
  attendanceOptions = [
    {
      id: 1,
      title: 'Registrar Asistencia',
      icon: 'clipboard',
      description: 'Registra la asistencia diaria',
      count: 4,
      label: 'Clases Registradas',
      color: 'blue',
      route: '/libro-clases/asistencia/registrar'
    },
    {
      id: 2,
      title: 'Consultar Asistencia',
      icon: 'check',
      description: 'Revisa asistencias pasadas',
      count: 11,
      label: 'Asistencias Totales',
      color: 'green',
      route: '/libro-clases/asistencia/consultar',
      active: true
    },
    {
      id: 3,
      title: 'Estadísticas',
      icon: 'chart',
      description: 'Analiza tendencias',
      count: 1,
      label: 'Notas Registradas',
      color: 'yellow',
      route: '/libro-clases/asistencia/estadisticas'
    },
    {
      id: 4,
      title: 'Informes',
      icon: 'users',
      description: 'Genera reportes',
      count: 3,
      label: 'Cursos Activos',
      color: 'purple',
      route: '/libro-clases/asistencia/informes'
    }
  ];

  selectedDay: any = null;
  showDayModal: boolean = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Inicialización del componente
  }

  // Navegación entre opciones
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  // Aplicar filtros
  applyFilters(): void {
    console.log('Aplicando filtros:', {
      course: this.selectedCourse,
      month: this.selectedMonth
    });
    this.showNotification('Filtros aplicados correctamente', 'success');
  }

  // Restablecer filtros
  resetFilters(): void {
    this.selectedCourse = '';
    this.selectedMonth = '2025-12';
    this.searchTerm = '';
    this.showNotification('Filtros restablecidos', 'info');
  }

  // Obtener clase de color para calendario
  getAttendanceClass(date: string): string {
    const data = this.attendanceData[date];
    if (!data) return 'attendance-none';

    const total = data.present + data.late + data.absent;
    const percentage = total > 0 ? (data.present / total) * 100 : 0;

    if (percentage >= 90) return 'attendance-high';
    if (percentage >= 70) return 'attendance-medium';
    return 'attendance-low';
  }

  // Obtener porcentaje de asistencia
  getAttendancePercentage(date: string): number {
    const data = this.attendanceData[date];
    if (!data) return 0;

    const total = data.present + data.late + data.absent;
    return total > 0 ? Math.round((data.present / total) * 100) : 0;
  }

  // Mostrar detalles del día
  showDayDetails(date: string): void {
    const data = this.attendanceData[date];
    if (!data) return;

    this.selectedDay = {
      date,
      ...data,
      percentage: this.getAttendancePercentage(date)
    };
    this.showDayModal = true;
  }

  // Cerrar modal
  closeDayModal(): void {
    this.showDayModal = false;
    this.selectedDay = null;
  }

  // Exportar datos
  exportAttendance(): void {
    const dataStr = JSON.stringify(this.attendanceData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asistencia_${this.selectedMonth}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.showNotification('Datos exportados correctamente', 'success');
  }

  // Mostrar notificación
  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    // Implementación de notificación
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  // Obtener días del mes actual
  getDaysInMonth(): Date[] {
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const days: Date[] = [];

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    return days;
  }

  // Formatear fecha
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
