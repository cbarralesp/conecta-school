import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Student {
  id: number;
  name: string;
  avatar: string;
  attendanceHistory: string[];
  currentStatus?: 'present' | 'late' | 'absent' | null;
  observation?: string;
}

interface AttendanceData {
  courseId: string;
  date: string;
  startTime: string;
  students: Student[];
  generalObservations: string;
}

@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistencia.component.html',
  styleUrls: ['./asistencia.component.css']
})
export class AsistenciaComponent implements OnInit {
  // Configuración
  selectedCourse: string = '1';
  selectedDate: string = new Date().toISOString().split('T')[0];
  startTime: string = '08:15';
  defaultStatus: string = 'present';
  generalObservations: string = '';
  saveStatus: string = '';
  searchTerm: string = '';
  filterStatus: string = '';

  // Datos de estudiantes
  students: Student[] = [
    { id: 1, name: 'Carlos Vargas', avatar: 'https://i.pravatar.cc/32?img=1', attendanceHistory: ['present', 'present', 'late', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 2, name: 'María Jara', avatar: 'https://i.pravatar.cc/32?img=2', attendanceHistory: ['present', 'present', 'present', 'late', 'present'], currentStatus: null, observation: '' },
    { id: 3, name: 'Luis Soto', avatar: 'https://i.pravatar.cc/32?img=3', attendanceHistory: ['present', 'absent', 'present', 'present', 'late'], currentStatus: null, observation: '' },
    { id: 4, name: 'Ana Martínez', avatar: 'https://i.pravatar.cc/32?img=4', attendanceHistory: ['present', 'present', 'present', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 5, name: 'Diego Flores', avatar: 'https://i.pravatar.cc/32?img=5', attendanceHistory: ['late', 'present', 'present', 'absent', 'present'], currentStatus: null, observation: '' },
    { id: 6, name: 'Sofía Díaz', avatar: 'https://i.pravatar.cc/32?img=6', attendanceHistory: ['present', 'present', 'present', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 7, name: 'Pedro Rojas', avatar: 'https://i.pravatar.cc/32?img=7', attendanceHistory: ['present', 'late', 'present', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 8, name: 'Valentina Morales', avatar: 'https://i.pravatar.cc/32?img=8', attendanceHistory: ['present', 'present', 'absent', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 9, name: 'Gabriel Torres', avatar: 'https://i.pravatar.cc/32?img=9', attendanceHistory: ['present', 'present', 'present', 'late', 'present'], currentStatus: null, observation: '' },
    { id: 10, name: 'Isabella Vargas', avatar: 'https://i.pravatar.cc/32?img=10', attendanceHistory: ['present', 'present', 'present', 'present', 'absent'], currentStatus: null, observation: '' },
    { id: 11, name: 'Mateo Silva', avatar: 'https://i.pravatar.cc/32?img=11', attendanceHistory: ['present', 'present', 'present', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 12, name: 'Lucía Hernández', avatar: 'https://i.pravatar.cc/32?img=12', attendanceHistory: ['late', 'present', 'present', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 13, name: 'Benjamín Ortiz', avatar: 'https://i.pravatar.cc/32?img=13', attendanceHistory: ['present', 'absent', 'present', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 14, name: 'Victoria Ramírez', avatar: 'https://i.pravatar.cc/32?img=14', attendanceHistory: ['present', 'present', 'present', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 15, name: 'Sebastián Castillo', avatar: 'https://i.pravatar.cc/32?img=15', attendanceHistory: ['present', 'present', 'late', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 16, name: 'Emily Guerrero', avatar: 'https://i.pravatar.cc/32?img=16', attendanceHistory: ['present', 'present', 'present', 'absent', 'present'], currentStatus: null, observation: '' },
    { id: 17, name: 'Daniel Mendoza', avatar: 'https://i.pravatar.cc/32?img=17', attendanceHistory: ['present', 'present', 'present', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 18, name: 'Sara Jiménez', avatar: 'https://i.pravatar.cc/32?img=18', attendanceHistory: ['present', 'late', 'present', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 19, name: 'Alejandro Ruiz', avatar: 'https://i.pravatar.cc/32?img=19', attendanceHistory: ['present', 'present', 'present', 'present', 'late'], currentStatus: null, observation: '' },
    { id: 20, name: 'Camila Flores', avatar: 'https://i.pravatar.cc/32?img=20', attendanceHistory: ['present', 'present', 'present', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 21, name: 'Andrés Morales', avatar: 'https://i.pravatar.cc/32?img=21', attendanceHistory: ['absent', 'present', 'present', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 22, name: 'Paula Castro', avatar: 'https://i.pravatar.cc/32?img=22', attendanceHistory: ['present', 'present', 'present', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 23, name: 'Javier Herrera', avatar: 'https://i.pravatar.cc/32?img=23', attendanceHistory: ['present', 'present', 'late', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 24, name: 'Valeria Ortiz', avatar: 'https://i.pravatar.cc/32?img=24', attendanceHistory: ['present', 'present', 'present', 'present', 'present'], currentStatus: null, observation: '' },
    { id: 25, name: 'Rodrigo Vargas', avatar: 'https://i.pravatar.cc/32?img=25', attendanceHistory: ['present', 'present', 'present', 'late', 'present'], currentStatus: null, observation: '' }
  ];

  // Plantillas de observaciones
  observationTemplates = [
    { text: 'Clase desarrollada con normalidad', color: 'blue' },
    { text: 'Se aplicó evaluación sorpresa', color: 'purple' },
    { text: 'Actividad práctica en laboratorio', color: 'green' },
    { text: 'Trabajo en grupos colaborativos', color: 'yellow' },
    { text: 'Exposición de temas', color: 'red' }
  ];

  ngOnInit(): void {
    this.loadDraftIfExists();
  }

  // Obtener estudiantes filtrados
  get filteredStudents(): Student[] {
    return this.students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesFilter = !this.filterStatus || student.currentStatus === this.filterStatus;
      return matchesSearch && matchesFilter;
    });
  }

  // Calcular resumen de asistencia
  get attendanceSummary() {
    const present = this.students.filter(s => s.currentStatus === 'present').length;
    const late = this.students.filter(s => s.currentStatus === 'late').length;
    const absent = this.students.filter(s => s.currentStatus === 'absent').length;
    const total = this.students.length;

    return { present, late, absent, total };
  }

  // Obtener tendencia de asistencia
  getAttendanceTrend(student: Student): { icon: string; color: string } {
    const recentAttendance = student.attendanceHistory.slice(-3);
    const presentCount = recentAttendance.filter(status => status === 'present').length;

    if (presentCount === 3) {
      return { icon: '📈', color: 'text-green-500' };
    } else if (presentCount === 2) {
      return { icon: '➡️', color: 'text-yellow-500' };
    } else {
      return { icon: '📉', color: 'text-red-500' };
    }
  }

  // Seleccionar asistencia
  selectAttendance(student: Student, status: 'present' | 'late' | 'absent'): void {
    student.currentStatus = status;
  }

  // Verificar si un estado está seleccionado
  isStatusSelected(student: Student, status: 'present' | 'late' | 'absent'): boolean {
    return student.currentStatus === status;
  }

  // Acciones rápidas
  markAllPresent(): void {
    this.students.forEach(student => student.currentStatus = 'present');
  }

  markAllAbsent(): void {
    this.students.forEach(student => student.currentStatus = 'absent');
  }

  loadPreviousAttendance(): void {
    const previousAttendance: ('present' | 'late' | 'absent')[] = ['present', 'present', 'late', 'present', 'absent', 'present', 'late', 'present', 'present', 'present', 'late', 'absent', 'present', 'present', 'late', 'present', 'present', 'late', 'present', 'absent', 'present', 'present', 'late', 'present', 'present'];

    this.students.forEach((student, index) => {
      student.currentStatus = previousAttendance[index % previousAttendance.length];
    });

    this.showSaveStatus('✓ Asistencia del día anterior cargada', 'success');
  }

  clearAllSelections(): void {
    this.students.forEach(student => {
      student.currentStatus = null;
      student.observation = '';
    });
    this.generalObservations = '';
  }

  // Plantillas de observaciones
  addObservationTemplate(template: string): void {
    if (this.generalObservations && !this.generalObservations.endsWith(' ')) {
      this.generalObservations += ' ';
    }
    this.generalObservations += template;
  }

  // Guardar y cargar
  saveAsDraft(): void {
    const attendanceData = this.collectAttendanceData();
    localStorage.setItem('attendanceDraft', JSON.stringify(attendanceData));
    this.showSaveStatus('✓ Borrador guardado', 'warning');
  }

  saveAttendance(): void {
    const attendanceData = this.collectAttendanceData();

    // Aquí iría la llamada al servicio para guardar en la base de datos
    console.log('Guardando asistencia:', attendanceData);

    localStorage.removeItem('attendanceDraft');
    this.showSaveStatus('✓ Asistencia guardada exitosamente', 'success');
  }

  private collectAttendanceData(): AttendanceData {
    return {
      courseId: this.selectedCourse,
      date: this.selectedDate,
      startTime: this.startTime,
      students: this.students.map(student => ({
        ...student,
        currentStatus: student.currentStatus || null,
        observation: student.observation || ''
      })),
      generalObservations: this.generalObservations
    };
  }

  private loadDraftIfExists(): void {
    const draft = localStorage.getItem('attendanceDraft');
    if (draft) {
      const attendanceData: AttendanceData = JSON.parse(draft);

      this.selectedCourse = attendanceData.courseId;
      this.selectedDate = attendanceData.date;
      this.startTime = attendanceData.startTime;
      this.generalObservations = attendanceData.generalObservations;

      attendanceData.students.forEach(studentData => {
        const student = this.students.find(s => s.id === studentData.id);
        if (student) {
          student.currentStatus = studentData.currentStatus || null;
          student.observation = studentData.observation || '';
        }
      });

      this.showSaveStatus('✓ Borrador recuperado', 'warning');
    }
  }

  private showSaveStatus(message: string, type: 'success' | 'warning'): void {
    this.saveStatus = message;
    setTimeout(() => {
      this.saveStatus = '';
    }, 3000);
  }

  // Exportar datos
  exportAttendance(): void {
    const attendanceData = this.collectAttendanceData();
    const dataStr = JSON.stringify(attendanceData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asistencia_${this.selectedDate}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }
}
