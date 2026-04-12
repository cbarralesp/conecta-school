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

@Component({
  selector: 'app-mis-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-cursos.component.html',
  styleUrls: ['./mis-cursos.component.css']
})
export class MisCursosComponent implements OnInit {
  cursos: Curso[] = [];
  estudiantes: Estudiante[] = [];
  asignaturas: string[] = [];

  // Modal
  showModal: boolean = false;
  modoEdicion: boolean = false;
  cursoForm = {
    id: 0,
    name: '',
    subject: '',
    studentIds: [] as number[],
    lastTopic: ''
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.inicializarDatosEjemplo();
    this.cargarDatos();
  }

  inicializarDatosEjemplo(): void {
    // Verificar si ya existen datos
    const cursosExistentes = localStorage.getItem('torreFuerteCursos');
    const estudiantesExistentes = localStorage.getItem('studentsList');
    const asignaturasExistentes = localStorage.getItem('torreFuerteAsignaturas');

    // Crear estudiantes de ejemplo si no existen
    if (!estudiantesExistentes) {
      const estudiantesEjemplo = [
        { id: 101, name: 'Carlos Vargas' },
        { id: 102, name: 'María Jara' },
        { id: 103, name: 'Luis Soto' },
        { id: 201, name: 'Sofía Díaz' },
        { id: 202, name: 'Pedro Rojas' },
        { id: 203, name: 'Valentina Morales' },
        { id: 301, name: 'Ana Martínez' },
        { id: 302, name: 'Diego Flores' },
        { id: 303, name: 'Isabella Torres' },
        { id: 304, name: 'Mateo Silva' }
      ];
      localStorage.setItem('studentsList', JSON.stringify(estudiantesEjemplo));
    }

    // Crear asignaturas de ejemplo si no existen
    if (!asignaturasExistentes) {
      const asignaturasEjemplo = [
        'Lenguaje y Comunicación',
        'Matemáticas',
        'Historia',
        'Ciencias Naturales',
        'Tecnología',
        'Música',
        'Educación Física',
        'Inglés',
        'Arte'
      ];
      localStorage.setItem('torreFuerteAsignaturas', JSON.stringify(asignaturasEjemplo));
    }

    // Crear cursos de ejemplo si no existen
    if (!cursosExistentes) {
      const cursosEjemplo: Curso[] = [
        {
          id: 1,
          name: '7° Básico B',
          subject: 'Matemáticas',
          studentIds: [101, 102, 103],
          lastTopic: 'Fracciones y Decimales'
        },
        {
          id: 2,
          name: '8° Básico A',
          subject: 'Lenguaje y Comunicación',
          studentIds: [201, 202, 203],
          lastTopic: 'Análisis de Poemas'
        },
        {
          id: 3,
          name: '4° básico A',
          subject: 'Música',
          studentIds: [301, 302, 303, 304],
          lastTopic: 'N/A'
        }
      ];
      localStorage.setItem('torreFuerteCursos', JSON.stringify(cursosEjemplo));
    }
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

    // Cargar asignaturas
    const asignaturasStorage = localStorage.getItem('torreFuerteAsignaturas');
    if (asignaturasStorage) {
      this.asignaturas = JSON.parse(asignaturasStorage);
    }
  }

  abrirModalCrear(): void {
    this.modoEdicion = false;
    this.cursoForm = {
      id: 0,
      name: '',
      subject: '',
      studentIds: [],
      lastTopic: ''
    };
    this.showModal = true;
  }

  abrirModalEditar(curso: Curso): void {
    this.modoEdicion = true;
    this.cursoForm = {
      id: curso.id,
      name: curso.name,
      subject: curso.subject,
      studentIds: [...curso.studentIds],
      lastTopic: curso.lastTopic || ''
    };
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
  }

  toggleEstudiante(estudianteId: number): void {
    const index = this.cursoForm.studentIds.indexOf(estudianteId);
    if (index > -1) {
      this.cursoForm.studentIds.splice(index, 1);
    } else {
      this.cursoForm.studentIds.push(estudianteId);
    }
  }

  isEstudianteSeleccionado(estudianteId: number): boolean {
    return this.cursoForm.studentIds.includes(estudianteId);
  }

  guardarCurso(): void {
    if (!this.cursoForm.name || !this.cursoForm.subject || this.cursoForm.studentIds.length === 0) {
      alert('Por favor completa todos los campos requeridos y selecciona al menos un estudiante');
      return;
    }

    if (this.modoEdicion) {
      // Actualizar curso existente
      const index = this.cursos.findIndex(c => c.id === this.cursoForm.id);
      if (index !== -1) {
        this.cursos[index] = {
          id: this.cursoForm.id,
          name: this.cursoForm.name,
          subject: this.cursoForm.subject,
          studentIds: this.cursoForm.studentIds,
          lastTopic: this.cursoForm.lastTopic
        };
      }
    } else {
      // Crear nuevo curso
      const nuevoCurso: Curso = {
        id: Date.now(),
        name: this.cursoForm.name,
        subject: this.cursoForm.subject,
        studentIds: this.cursoForm.studentIds,
        lastTopic: this.cursoForm.lastTopic
      };
      this.cursos.push(nuevoCurso);
    }

    localStorage.setItem('torreFuerteCursos', JSON.stringify(this.cursos));
    alert(this.modoEdicion ? 'Curso actualizado exitosamente' : 'Curso creado exitosamente');
    this.cerrarModal();
  }

  eliminarCurso(curso: Curso): void {
    if (confirm(`¿Estás seguro de que quieres eliminar el curso "${curso.name}"? Esta acción no se puede deshacer.`)) {
      this.cursos = this.cursos.filter(c => c.id !== curso.id);
      localStorage.setItem('torreFuerteCursos', JSON.stringify(this.cursos));
      alert('Curso eliminado');
    }
  }

  navegarA(ruta: string, cursoId?: number): void {
    // Aquí puedes implementar la navegación con parámetros si es necesario
    alert(`Navegar a ${ruta} para el curso ${cursoId || ''}`);
  }
}
