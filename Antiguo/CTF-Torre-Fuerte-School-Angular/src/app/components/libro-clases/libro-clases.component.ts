import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Curso {
  id: number;
  name: string;
  subject: string;
  studentIds: number[];
  lastTopic?: string;
}

interface Estudiante {
  id: number;
  name: string;
}

interface RegistroAsistencia {
  students: { [studentId: number]: string };
  observations: string;
  recordedAt: string;
}

interface RegistroNota {
  type: string;
  date: string;
  description: string;
  maxGrade: number;
  students: { [studentId: number]: { exempt: boolean; score: number | null } };
  recordedAt: string;
}

@Component({
  selector: 'app-libro-clases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './libro-clases.component.html',
  styleUrls: ['./libro-clases.component.css']
})
export class LibroClasesComponent implements OnInit {
  cursos: Curso[] = [];
  estudiantes: Estudiante[] = [];

  // Datos de estadísticas
  totalClases: number = 0;
  totalAsistencias: number = 0;
  totalNotas: number = 0;

  // Modal de Asistencia
  showAsistenciaModal: boolean = false;
  asistenciaForm = {
    courseId: 0,
    date: '',
    observations: '',
    estudiantes: [] as { id: number; name: string; status: string }[]
  };

  // Modal de Notas
  showNotasModal: boolean = false;
  notasForm = {
    courseId: 0,
    type: '',
    date: '',
    description: '',
    maxGrade: 100,
    estudiantes: [] as { id: number; name: string; score: number | null; exempt: boolean }[]
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.cargarDatos();
    this.calcularEstadisticas();
  }

  cargarDatos(): void {
    // Cargar cursos
    const cursosStorage = localStorage.getItem('torreFuerteCursos');
    if (cursosStorage) {
      this.cursos = JSON.parse(cursosStorage);
    }

    // Cargar estudiantes
    const estudiantesStorage = localStorage.getItem('studentsList');
    if (estudiantesStorage) {
      this.estudiantes = JSON.parse(estudiantesStorage);
    }
  }

  calcularEstadisticas(): void {
    const attendanceData = JSON.parse(localStorage.getItem('torreFuerteAsistencia') || '{}');
    const gradesData = JSON.parse(localStorage.getItem('torreFuerteNotas') || '{}');

    this.totalClases = 0;
    this.totalAsistencias = 0;
    this.totalNotas = 0;

    // Contar asistencias
    Object.keys(attendanceData).forEach(courseId => {
      Object.keys(attendanceData[courseId]).forEach(date => {
        this.totalClases++;
        const dayAttendance = attendanceData[courseId][date];
        Object.values(dayAttendance.students || {}).forEach((status: any) => {
          if (status === 'present') this.totalAsistencias++;
        });
      });
    });

    // Contar notas
    Object.keys(gradesData).forEach(courseId => {
      Object.keys(gradesData[courseId]).forEach(gradeId => {
        const grade = gradesData[courseId][gradeId];
        Object.values(grade.students || {}).forEach((studentGrade: any) => {
          if (studentGrade.score !== null && studentGrade.score !== undefined) {
            this.totalNotas++;
          }
        });
      });
    });
  }

  getAttendanceCount(courseId: number): number {
    const attendanceData = JSON.parse(localStorage.getItem('torreFuerteAsistencia') || '{}');
    return Object.keys(attendanceData[courseId] || {}).length;
  }

  getGradesCount(courseId: number): number {
    const gradesData = JSON.parse(localStorage.getItem('torreFuerteNotas') || '{}');
    return Object.keys(gradesData[courseId] || {}).length;
  }

  // NAVEGACIÓN
  navegarAGestionCursos(): void {
    this.router.navigate(['/mis-cursos']);
  }

  // ASISTENCIA
  abrirModalAsistencia(courseId?: number): void {
    this.asistenciaForm = {
      courseId: courseId || 0,
      date: new Date().toISOString().split('T')[0],
      observations: '',
      estudiantes: []
    };

    if (courseId) {
      this.cargarEstudiantesAsistencia(courseId);
    }

    this.showAsistenciaModal = true;
  }

  cargarEstudiantesAsistencia(courseId: number): void {
    const curso = this.cursos.find(c => c.id === courseId);
    if (!curso) return;

    this.asistenciaForm.estudiantes = this.estudiantes
      .filter(e => curso.studentIds.includes(e.id))
      .map(e => ({
        id: e.id,
        name: e.name,
        status: 'present'
      }));
  }

  onCursoAsistenciaChange(): void {
    if (this.asistenciaForm.courseId) {
      this.cargarEstudiantesAsistencia(this.asistenciaForm.courseId);
    }
  }

  cerrarModalAsistencia(): void {
    this.showAsistenciaModal = false;
  }

  guardarAsistencia(): void {
    if (!this.asistenciaForm.courseId || !this.asistenciaForm.date) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const attendanceData: { [key: string]: any } = {};
    this.asistenciaForm.estudiantes.forEach(e => {
      attendanceData[e.id] = e.status;
    });

    let allAttendance = JSON.parse(localStorage.getItem('torreFuerteAsistencia') || '{}');
    if (!allAttendance[this.asistenciaForm.courseId]) {
      allAttendance[this.asistenciaForm.courseId] = {};
    }

    allAttendance[this.asistenciaForm.courseId][this.asistenciaForm.date] = {
      students: attendanceData,
      observations: this.asistenciaForm.observations,
      recordedAt: new Date().toISOString()
    };

    localStorage.setItem('torreFuerteAsistencia', JSON.stringify(allAttendance));
    alert('Asistencia registrada exitosamente');
    this.cerrarModalAsistencia();
    this.calcularEstadisticas();
  }

  // NOTAS
  abrirModalNotas(courseId?: number): void {
    this.notasForm = {
      courseId: courseId || 0,
      type: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      maxGrade: 100,
      estudiantes: []
    };

    if (courseId) {
      this.cargarEstudiantesNotas(courseId);
    }

    this.showNotasModal = true;
  }

  cargarEstudiantesNotas(courseId: number): void {
    const curso = this.cursos.find(c => c.id === courseId);
    if (!curso) return;

    this.notasForm.estudiantes = this.estudiantes
      .filter(e => curso.studentIds.includes(e.id))
      .map(e => ({
        id: e.id,
        name: e.name,
        score: null,
        exempt: false
      }));
  }

  onCursoNotasChange(): void {
    if (this.notasForm.courseId) {
      this.cargarEstudiantesNotas(this.notasForm.courseId);
    }
  }

  cerrarModalNotas(): void {
    this.showNotasModal = false;
  }

  guardarNotas(): void {
    if (!this.notasForm.courseId || !this.notasForm.type || !this.notasForm.date ||
        !this.notasForm.description || !this.notasForm.maxGrade) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const gradesData: { [key: string]: any } = {};
    this.notasForm.estudiantes.forEach(e => {
      gradesData[e.id] = {
        exempt: e.exempt,
        score: e.exempt ? null : e.score
      };
    });

    let allGrades = JSON.parse(localStorage.getItem('torreFuerteNotas') || '{}');
    if (!allGrades[this.notasForm.courseId]) {
      allGrades[this.notasForm.courseId] = {};
    }

    const gradeId = Date.now().toString();
    allGrades[this.notasForm.courseId][gradeId] = {
      type: this.notasForm.type,
      date: this.notasForm.date,
      description: this.notasForm.description,
      maxGrade: this.notasForm.maxGrade,
      students: gradesData,
      recordedAt: new Date().toISOString()
    };

    localStorage.setItem('torreFuerteNotas', JSON.stringify(allGrades));
    alert('Notas registradas exitosamente');
    this.cerrarModalNotas();
    this.calcularEstadisticas();
  }

  verDetallesCurso(courseId: number): void {
    // Implementar navegación a detalles del curso
    alert(`Ver detalles del curso ${courseId} (por implementar)`);
  }
}
