import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Student {
  code: string;
  rut: string;
  name: string;
  course: string;
  level: string;
  status: 'Regular' | 'Nuevo Ingreso';
}

interface StudentForm {
  nombre: string;
  run: string;
  curso: string;
  estado: string;
  direccion: string;
  apoderado: string;
  telefono: string;
}

@Component({
  selector: 'app-matricula',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './matricula.component.html',
  styleUrls: ['./matricula.component.css']
})
export class MatriculaComponent implements OnInit {
  // Filtros
  selectedYear = '2025';
  selectedCourse = 'Todos';
  searchQuery = '';

  // Estadísticas
  totalStudents = 3;
  maleStudents = 2;
  femaleStudents = 1;

  // Modal
  showModal = false;
  showNotification = false;
  notificationMessage = 'Matrícula completada con éxito';

  // Formulario
  studentForm: StudentForm = {
    nombre: '',
    run: '',
    curso: '',
    estado: 'nuevo',
    direccion: '',
    apoderado: '',
    telefono: ''
  };

  // Lista de años disponibles
  years = ['2025', '2024', '2023', '2022'];

  // Lista de cursos disponibles
  courses = [
    'Todos',
    '7° Básico A',
    '7° Básico B',
    '8° Básico A',
    '8° Básico B',
    '1° Medio A',
    '1° Medio B'
  ];

  // Lista de estudiantes
  students: Student[] = [
    {
      code: 'MAT2023003',
      rut: '12.345.678-9',
      name: 'Juan Carlos González Méndez',
      course: '7° Básico B',
      level: 'Básico',
      status: 'Regular'
    },
    {
      code: 'MAT2023002',
      rut: '13.456.789-0',
      name: 'Ana Sofía Gómez López',
      course: '7° Básico B',
      level: 'Básico',
      status: 'Nuevo Ingreso'
    },
    {
      code: 'MAT2023001',
      rut: '14.567.890-1',
      name: 'Pedro Antonio Rojas Silva',
      course: '8° Básico A',
      level: 'Básico',
      status: 'Regular'
    }
  ];

  // Lista filtrada de estudiantes
  filteredStudents: Student[] = [];

  ngOnInit() {
    this.filteredStudents = [...this.students];
  }

  // Abrir modal
  openModal() {
    this.showModal = true;
    this.resetForm();
  }

  // Cerrar modal
  closeModal() {
    this.showModal = false;
    this.resetForm();
  }

  // Resetear formulario
  resetForm() {
    this.studentForm = {
      nombre: '',
      run: '',
      curso: '',
      estado: 'nuevo',
      direccion: '',
      apoderado: '',
      telefono: ''
    };
  }

  // Guardar matrícula
  saveMatricula() {
    if (this.validateForm()) {
      // Generar código de matrícula
      const newCode = `MAT${new Date().getFullYear()}${String(this.students.length + 1).padStart(3, '0')}`;

      // Crear nuevo estudiante
      const newStudent: Student = {
        code: newCode,
        rut: this.studentForm.run,
        name: this.studentForm.nombre,
        course: this.studentForm.curso,
        level: 'Básico',
        status: this.studentForm.estado === 'nuevo' ? 'Nuevo Ingreso' : 'Regular'
      };

      // Agregar a la lista
      this.students.unshift(newStudent);

      // Actualizar estadísticas (simplificado)
      this.totalStudents++;

      // Actualizar lista filtrada
      this.applyFilters();

      // Cerrar modal
      this.closeModal();

      // Mostrar notificación
      this.showSuccessNotification('Estudiante matriculado exitosamente');
    } else {
      this.showSuccessNotification('Por favor, complete todos los campos requeridos', 'error');
    }
  }

  // Validar formulario
  validateForm(): boolean {
    return !!(
      this.studentForm.nombre &&
      this.studentForm.run &&
      this.studentForm.curso &&
      this.studentForm.apoderado &&
      this.studentForm.telefono
    );
  }

  // Mostrar notificación
  showSuccessNotification(message: string, type: 'success' | 'error' = 'success') {
    this.notificationMessage = message;
    this.showNotification = true;

    setTimeout(() => {
      this.showNotification = false;
    }, 3000);
  }

  // Aplicar filtros
  applyFilters() {
    this.filteredStudents = this.students.filter(student => {
      // Filtro por curso
      const courseMatch = this.selectedCourse === 'Todos' || student.course === this.selectedCourse;

      // Filtro por búsqueda
      const searchMatch = !this.searchQuery ||
        student.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        student.rut.includes(this.searchQuery) ||
        student.code.toLowerCase().includes(this.searchQuery.toLowerCase());

      return courseMatch && searchMatch;
    });
  }

  // Cambio de año
  onYearChange() {
    console.log('Año seleccionado:', this.selectedYear);
    // Aquí podrías cargar estudiantes del año seleccionado
  }

  // Cambio de curso
  onCourseChange() {
    this.applyFilters();
  }

  // Búsqueda
  onSearch() {
    this.applyFilters();
  }

  // Ver estudiante
  viewStudent(student: Student) {
    console.log('Ver estudiante:', student);
    // Aquí implementarías la lógica para ver el detalle
  }

  // Editar estudiante
  editStudent(student: Student) {
    console.log('Editar estudiante:', student);
    // Aquí implementarías la lógica para editar
    this.studentForm = {
      nombre: student.name,
      run: student.rut,
      curso: student.course,
      estado: student.status === 'Regular' ? 'regular' : 'nuevo',
      direccion: '',
      apoderado: '',
      telefono: ''
    };
    this.openModal();
  }

  // Eliminar estudiante
  deleteStudent(student: Student) {
    if (confirm(`¿Está seguro de eliminar al estudiante ${student.name}?`)) {
      const index = this.students.findIndex(s => s.code === student.code);
      if (index > -1) {
        this.students.splice(index, 1);
        this.totalStudents--;
        this.applyFilters();
        this.showSuccessNotification('Estudiante eliminado exitosamente');
      }
    }
  }

  // Obtener clase del badge de estado
  getStatusClass(status: string): string {
    return status === 'Regular'
      ? 'bg-green-100 text-green-800'
      : 'bg-blue-100 text-blue-800';
  }
}
