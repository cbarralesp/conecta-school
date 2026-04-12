import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Student {
  id: number;
  name: string;
  initials: string;
  avatar: string;
  grades: {
    eval1: number | null;
    eval2: number | null;
    eval3: number | null;
    eval4: number | null;
  };
  average: number;
  status: 'excellent' | 'good' | 'regular' | 'deficient';
}

interface Course {
  id: string;
  name: string;
  subject: string;
  students: Student[];
}

interface TabOption {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-calificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calificaciones.component.html',
  styleUrls: ['./calificaciones.component.css']
})
export class CalificacionesComponent implements OnInit {
  // Tabs de navegación
  tabs: TabOption[] = [
    { id: 'asistencia', label: 'Asistencia', icon: 'clipboard' },
    { id: 'calificaciones', label: 'Calificaciones', icon: 'star' },
    { id: 'observaciones', label: 'Ficha y Observaciones', icon: 'user' }
  ];

  activeTab: string = 'calificaciones';

  // Filtros
  selectedCourse: string = '1';
  searchTerm: string = '';
  selectedPeriod: string = 'semestre1';

  // Cursos disponibles
  courses: Course[] = [
    {
      id: '1',
      name: '7° Básico B',
      subject: 'Matemáticas',
      students: [
        {
          id: 1,
          name: 'Ana García',
          initials: 'AG',
          avatar: 'https://i.pravatar.cc/40?img=1',
          grades: { eval1: 6.5, eval2: 5.8, eval3: 6.2, eval4: 6.0 },
          average: 6.1,
          status: 'good'
        },
        {
          id: 2,
          name: 'Carlos Ruiz',
          initials: 'CR',
          avatar: 'https://i.pravatar.cc/40?img=2',
          grades: { eval1: 5.5, eval2: 5.0, eval3: 5.8, eval4: 5.5 },
          average: 5.5,
          status: 'regular'
        },
        {
          id: 3,
          name: 'María López',
          initials: 'ML',
          avatar: 'https://i.pravatar.cc/40?img=3',
          grades: { eval1: 6.8, eval2: 6.5, eval3: 7.0, eval4: 6.7 },
          average: 6.8,
          status: 'excellent'
        },
        {
          id: 4,
          name: 'Pedro Sánchez',
          initials: 'PS',
          avatar: 'https://i.pravatar.cc/40?img=4',
          grades: { eval1: 6.0, eval2: 5.5, eval3: 6.2, eval4: 5.9 },
          average: 5.9,
          status: 'regular'
        },
        {
          id: 5,
          name: 'Laura Martínez',
          initials: 'LM',
          avatar: 'https://i.pravatar.cc/40?img=5',
          grades: { eval1: 6.2, eval2: 6.0, eval3: 6.5, eval4: 6.3 },
          average: 6.3,
          status: 'good'
        },
        {
          id: 6,
          name: 'Diego Torres',
          initials: 'DT',
          avatar: 'https://i.pravatar.cc/40?img=6',
          grades: { eval1: 4.5, eval2: 4.8, eval3: 5.0, eval4: 4.7 },
          average: 4.8,
          status: 'deficient'
        },
        {
          id: 7,
          name: 'Sofía Vargas',
          initials: 'SV',
          avatar: 'https://i.pravatar.cc/40?img=7',
          grades: { eval1: 6.9, eval2: 7.0, eval3: 6.8, eval4: 6.9 },
          average: 6.9,
          status: 'excellent'
        },
        {
          id: 8,
          name: 'Andrés Morales',
          initials: 'AM',
          avatar: 'https://i.pravatar.cc/40?img=8',
          grades: { eval1: 5.8, eval2: 6.1, eval3: 5.9, eval4: 6.0 },
          average: 6.0,
          status: 'regular'
        }
      ]
    },
    {
      id: '2',
      name: '8° Básico A',
      subject: 'Lenguaje',
      students: [
        {
          id: 9,
          name: 'Valentina Rojas',
          initials: 'VR',
          avatar: 'https://i.pravatar.cc/40?img=9',
          grades: { eval1: 6.7, eval2: 6.5, eval3: 6.8, eval4: 6.6 },
          average: 6.7,
          status: 'excellent'
        },
        {
          id: 10,
          name: 'Mateo Silva',
          initials: 'MS',
          avatar: 'https://i.pravatar.cc/40?img=10',
          grades: { eval1: 5.2, eval2: 5.5, eval3: 5.4, eval4: 5.3 },
          average: 5.4,
          status: 'regular'
        }
      ]
    }
  ];

  // Datos actuales
  currentCourse: Course | undefined;
  editingCell: { studentId: number; eval: string } | null = null;
  tempGradeValue: string = '';
  hasUnsavedChanges: boolean = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadCourse();
  }

  // Cargar curso seleccionado
  loadCourse(): void {
    this.currentCourse = this.courses.find(c => c.id === this.selectedCourse);
  }

  // Cambiar de tab
  changeTab(tabId: string): void {
    if (this.hasUnsavedChanges) {
      const confirm = window.confirm('Tienes cambios sin guardar. ¿Deseas continuar?');
      if (!confirm) return;
    }
    this.activeTab = tabId;
    // Aquí puedes navegar a otras rutas si es necesario
  }

  // Cambiar curso
  onCourseChange(): void {
    if (this.hasUnsavedChanges) {
      const confirm = window.confirm('Tienes cambios sin guardar. ¿Deseas continuar?');
      if (!confirm) {
        return;
      }
    }
    this.loadCourse();
    this.hasUnsavedChanges = false;
  }

  // Obtener estudiantes filtrados
  get filteredStudents(): Student[] {
    if (!this.currentCourse) return [];

    let students = this.currentCourse.students;

    if (this.searchTerm) {
      students = students.filter(s =>
        s.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    return students;
  }

  // Editar celda
  startEditing(studentId: number, evalKey: string): void {
    if (!this.currentCourse) return;

    const student = this.currentCourse.students.find(s => s.id === studentId);
    if (!student) return;

    this.editingCell = { studentId, eval: evalKey };
    const currentValue = student.grades[evalKey as keyof typeof student.grades];
    this.tempGradeValue = currentValue !== null ? currentValue.toString() : '';
  }

  // Guardar nota editada
  saveGrade(studentId: number, evalKey: string): void {
    if (!this.currentCourse) return;

    const student = this.currentCourse.students.find(s => s.id === studentId);
    if (!student) return;

    const newGrade = parseFloat(this.tempGradeValue);

    if (isNaN(newGrade) || newGrade < 1.0 || newGrade > 7.0) {
      alert('La nota debe estar entre 1.0 y 7.0');
      this.cancelEditing();
      return;
    }

    student.grades[evalKey as keyof typeof student.grades] = parseFloat(newGrade.toFixed(1));
    this.recalculateAverage(student);
    this.hasUnsavedChanges = true;
    this.cancelEditing();
  }

  // Cancelar edición
  cancelEditing(): void {
    this.editingCell = null;
    this.tempGradeValue = '';
  }

  // Verificar si está editando
  isEditing(studentId: number, evalKey: string): boolean {
    return this.editingCell?.studentId === studentId && this.editingCell?.eval === evalKey;
  }

  // Recalcular promedio
  recalculateAverage(student: Student): void {
    const grades = Object.values(student.grades).filter(g => g !== null) as number[];
    if (grades.length === 0) {
      student.average = 0;
      return;
    }

    const sum = grades.reduce((acc, g) => acc + g, 0);
    student.average = parseFloat((sum / grades.length).toFixed(1));
    student.status = this.getStatus(student.average);
  }

  // Obtener estado según promedio
  getStatus(average: number): 'excellent' | 'good' | 'regular' | 'deficient' {
    if (average >= 6.5) return 'excellent';
    if (average >= 6.0) return 'good';
    if (average >= 5.0) return 'regular';
    return 'deficient';
  }

  // Obtener clase de color para promedio
  getAverageClass(average: number): string {
    if (average >= 6.5) return 'bg-green-500';
    if (average >= 6.0) return 'bg-green-400';
    if (average >= 5.0) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  // Obtener estadísticas del curso
  get courseStats() {
    if (!this.currentCourse) return { excellent: 0, good: 0, regular: 0, deficient: 0, average: 0 };

    const students = this.currentCourse.students;
    const stats = {
      excellent: students.filter(s => s.status === 'excellent').length,
      good: students.filter(s => s.status === 'good').length,
      regular: students.filter(s => s.status === 'regular').length,
      deficient: students.filter(s => s.status === 'deficient').length,
      average: 0
    };

    const totalAverage = students.reduce((acc, s) => acc + s.average, 0);
    stats.average = students.length > 0 ? parseFloat((totalAverage / students.length).toFixed(1)) : 0;

    return stats;
  }

  // Guardar calificaciones
  saveGrades(): void {
    // Aquí iría la llamada al servicio para guardar en la base de datos
    console.log('Guardando calificaciones:', this.currentCourse);
    this.hasUnsavedChanges = false;
    this.showNotification('Calificaciones guardadas exitosamente', 'success');
  }

  // Exportar calificaciones
  exportGrades(): void {
    const dataStr = JSON.stringify(this.currentCourse, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calificaciones_${this.currentCourse?.name}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.showNotification('Calificaciones exportadas correctamente', 'success');
  }

  // Generar informe
  generateReport(): void {
    // Navegar a la vista de informes con los datos del curso actual
    this.router.navigate(['/libro-clases/informes'], {
      queryParams: {
        courseId: this.selectedCourse,
        type: 'calificaciones'
      }
    });
  }

  // Mostrar notificación
  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    // Implementación de notificación
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(message);
  }

  // Manejar tecla Enter en input
  handleKeyPress(event: KeyboardEvent, studentId: number, evalKey: string): void {
    if (event.key === 'Enter') {
      this.saveGrade(studentId, evalKey);
    } else if (event.key === 'Escape') {
      this.cancelEditing();
    }
  }
}
