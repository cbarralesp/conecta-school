import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-gestion-asignaturas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-asignaturas.component.html',
  styleUrls: ['./gestion-asignaturas.component.css']
})
export class GestionAsignaturasComponent implements OnInit {

  constructor(private router: Router) {}
  asignaturas: string[] = [];
  showModal: boolean = false;
  modoEdicion: boolean = false;
  asignaturaActual: string = '';
  asignaturaNueva: string = '';
  mensajeError: string = '';

  ngOnInit(): void {
    this.cargarAsignaturas();
  }

  cargarAsignaturas(): void {
    const asignaturasStorage = localStorage.getItem('torreFuerteAsignaturas');
    if (asignaturasStorage) {
      this.asignaturas = JSON.parse(asignaturasStorage);
    } else {
      // Asignaturas por defecto
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
      this.guardarAsignaturas();
    }
  }

  guardarAsignaturas(): void {
    localStorage.setItem('torreFuerteAsignaturas', JSON.stringify(this.asignaturas));
  }

  abrirModalCrear(): void {
    this.modoEdicion = false;
    this.asignaturaNueva = '';
    this.asignaturaActual = '';
    this.mensajeError = '';
    this.showModal = true;
  }

  abrirModalEditar(asignatura: string): void {
    this.modoEdicion = true;
    this.asignaturaActual = asignatura;
    this.asignaturaNueva = asignatura;
    this.mensajeError = '';
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
    this.modoEdicion = false;
    this.asignaturaActual = '';
    this.asignaturaNueva = '';
    this.mensajeError = '';
  }

  guardarAsignatura(): void {
    this.mensajeError = '';

    // Validar que el campo no esté vacío
    if (!this.asignaturaNueva || this.asignaturaNueva.trim() === '') {
      this.mensajeError = 'El nombre de la asignatura no puede estar vacío';
      return;
    }

    // Limpiar espacios
    const asignaturaTrimmed = this.asignaturaNueva.trim();

    if (this.modoEdicion) {
      // Modo edición
      const index = this.asignaturas.indexOf(this.asignaturaActual);

      // Verificar que no exista otra asignatura con el mismo nombre
      if (this.asignaturas.some((a, i) => a.toLowerCase() === asignaturaTrimmed.toLowerCase() && i !== index)) {
        this.mensajeError = 'Ya existe una asignatura con este nombre';
        return;
      }

      if (index !== -1) {
        this.asignaturas[index] = asignaturaTrimmed;

        // Actualizar también en el horario si existe
        this.actualizarAsignaturaEnHorario(this.asignaturaActual, asignaturaTrimmed);

        this.guardarAsignaturas();
        this.cerrarModal();
      }
    } else {
      // Modo creación
      // Verificar que no exista ya
      if (this.asignaturas.some(a => a.toLowerCase() === asignaturaTrimmed.toLowerCase())) {
        this.mensajeError = 'Esta asignatura ya existe';
        return;
      }

      this.asignaturas.push(asignaturaTrimmed);
      this.guardarAsignaturas();
      this.cerrarModal();
    }
  }

  eliminarAsignatura(asignatura: string): void {
    if (confirm(`¿Estás seguro de que quieres eliminar la asignatura "${asignatura}"? Esta acción no se puede deshacer y se eliminará del horario si está en uso.`)) {
      // Eliminar de la lista
      this.asignaturas = this.asignaturas.filter(a => a !== asignatura);
      this.guardarAsignaturas();

      // Eliminar del horario
      this.eliminarAsignaturaDelHorario(asignatura);
    }
  }

  private actualizarAsignaturaEnHorario(asignaturaAntigua: string, asignaturaNueva: string): void {
    const horarioStorage = localStorage.getItem('torreFuerteHorario');
    if (horarioStorage) {
      const horario = JSON.parse(horarioStorage);

      Object.keys(horario).forEach(dia => {
        Object.keys(horario[dia]).forEach(hora => {
          if (horario[dia][hora] === asignaturaAntigua) {
            horario[dia][hora] = asignaturaNueva;
          }
        });
      });

      localStorage.setItem('torreFuerteHorario', JSON.stringify(horario));
    }
  }

  private eliminarAsignaturaDelHorario(asignatura: string): void {
    const horarioStorage = localStorage.getItem('torreFuerteHorario');
    if (horarioStorage) {
      const horario = JSON.parse(horarioStorage);

      Object.keys(horario).forEach(dia => {
        Object.keys(horario[dia]).forEach(hora => {
          if (horario[dia][hora] === asignatura) {
            delete horario[dia][hora];
          }
        });
      });

      localStorage.setItem('torreFuerteHorario', JSON.stringify(horario));
    }
  }

  volverHorario(): void {
    this.router.navigate(['/horario']);
  }
}
