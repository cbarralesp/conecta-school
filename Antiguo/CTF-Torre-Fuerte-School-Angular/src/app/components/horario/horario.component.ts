import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface HorarioBloque {
  dia: string;
  hora: string;
  asignatura: string;
}

@Component({
  selector: 'app-horario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './horario.component.html',
  styleUrls: ['./horario.component.css']
})
export class HorarioComponent implements OnInit {
  dias: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  horas: string[] = ['8:30 - 9:30', '9:45 - 10:45', '11:00 - 12:00', '12:15 - 13:15'];

  asignaturas: string[] = [];
  horario: { [key: string]: { [key: string]: string } } = {};

  showModal: boolean = false;
  bloqueSeleccionado: { dia: string; hora: string } = { dia: '', hora: '' };
  asignaturaSeleccionada: string = '';

  coloresAsignaturas: { [key: string]: string } = {
    'Lenguaje': 'bg-blue-100 text-blue-800 border-blue-300',
    'Matemáticas': 'bg-purple-100 text-purple-800 border-purple-300',
    'Historia': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Ciencias Naturales': 'bg-green-100 text-green-800 border-green-300',
    'Tecnología': 'bg-red-100 text-red-800 border-red-300',
    'Música': 'bg-pink-100 text-pink-800 border-pink-300',
    'Educación Física': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'Inglés': 'bg-teal-100 text-teal-800 border-teal-300',
    'Recreo': 'bg-gray-100 text-gray-800 border-gray-300'
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.cargarAsignaturas();
    this.cargarHorario();
  }

  cargarAsignaturas(): void {
    const asignaturasStorage = localStorage.getItem('torreFuerteAsignaturas');
    if (asignaturasStorage) {
      this.asignaturas = JSON.parse(asignaturasStorage);
    } else {
      this.asignaturas = [
        'Lenguaje',
        'Matemáticas',
        'Historia',
        'Ciencias Naturales',
        'Tecnología',
        'Música',
        'Educación Física',
        'Inglés'
      ];
      localStorage.setItem('torreFuerteAsignaturas', JSON.stringify(this.asignaturas));
    }
  }

  cargarHorario(): void {
    const horarioStorage = localStorage.getItem('torreFuerteHorario');
    if (horarioStorage) {
      this.horario = JSON.parse(horarioStorage);
    } else {
      this.horario = {
        'Lunes': {
          '8:30 - 9:30': 'Matemáticas',
          '9:45 - 10:45': 'Lenguaje',
          '11:00 - 12:00': 'Ciencias Naturales',
          '12:15 - 13:15': 'Recreo'
        },
        'Martes': {
          '8:30 - 9:30': 'Historia',
          '9:45 - 10:45': 'Matemáticas',
          '11:00 - 12:00': 'Inglés',
          '12:15 - 13:15': 'Educación Física'
        },
        'Miércoles': {
          '8:30 - 9:30': 'Lenguaje',
          '9:45 - 10:45': 'Ciencias Naturales',
          '11:00 - 12:00': 'Matemáticas',
          '12:15 - 13:15': 'Música'
        },
        'Jueves': {
          '8:30 - 9:30': 'Inglés',
          '9:45 - 10:45': 'Historia',
          '11:00 - 12:00': 'Tecnología',
          '12:15 - 13:15': 'Recreo'
        },
        'Viernes': {
          '8:30 - 9:30': 'Matemáticas',
          '9:45 - 10:45': 'Lenguaje',
          '11:00 - 12:00': 'Historia',
          '12:15 - 13:15': 'Ciencias Naturales'
        }
      };
      this.guardarHorario();
    }
  }

  guardarHorario(): void {
    localStorage.setItem('torreFuerteHorario', JSON.stringify(this.horario));
  }

  obtenerAsignatura(dia: string, hora: string): string {
    return this.horario[dia]?.[hora] || 'Bloque Libre';
  }

  obtenerColorClase(asignatura: string): string {
    return this.coloresAsignaturas[asignatura] || 'bg-gray-50 text-gray-800';
  }

  abrirModal(dia: string, hora: string): void {
    this.bloqueSeleccionado = { dia, hora };
    this.asignaturaSeleccionada = this.obtenerAsignatura(dia, hora);
    if (this.asignaturaSeleccionada === 'Bloque Libre') {
      this.asignaturaSeleccionada = '';
    }
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
    this.bloqueSeleccionado = { dia: '', hora: '' };
    this.asignaturaSeleccionada = '';
  }

  guardarBloque(): void {
    const { dia, hora } = this.bloqueSeleccionado;

    if (!this.horario[dia]) {
      this.horario[dia] = {};
    }

    if (this.asignaturaSeleccionada) {
      this.horario[dia][hora] = this.asignaturaSeleccionada;
    } else {
      delete this.horario[dia][hora];
    }

    this.guardarHorario();
    this.cerrarModal();
  }

  navegarGestionAsignaturas(): void {
    this.router.navigate(['/gestion-asignaturas']);
  }
}
