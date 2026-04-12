import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StatsCard {
  title: string;
  value: string;
  icon: string;
  bgColor: string;
  iconColor: string;
}

interface Activity {
  message: string;
  type: 'success' | 'warning' | 'info';
  color: string;
}

interface QuickAccess {
  name: string;
  icon: string;
  route: string;
}

interface Announcement {
  title: string;
  message: string;
  type: 'warning' | 'info';
  bgColor: string;
  borderColor: string;
  textColor: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  userName = 'Profesor';
  greeting = '';

  statsCards: StatsCard[] = [
    {
      title: 'Estudiantes',
      value: '342',
      icon: 'users',
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Asistencia Hoy',
      value: '98%',
      icon: 'check',
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      title: 'Por Evaluar',
      value: '12',
      icon: 'clock',
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    {
      title: 'Progreso Mensual',
      value: '+15%',
      icon: 'trending',
      bgColor: 'bg-teal-100',
      iconColor: 'text-teal-600'
    }
  ];

  recentActivities: Activity[] = [
    {
      message: 'Ana García entregó "Tarea de Matemáticas"',
      type: 'success',
      color: 'bg-green-500'
    },
    {
      message: 'Necesitas calificar 3 exámenes de Ciencias',
      type: 'warning',
      color: 'bg-orange-500'
    },
    {
      message: 'Nueva planificación para "Literatura" publicada',
      type: 'info',
      color: 'bg-blue-500'
    }
  ];

  quickAccess: QuickAccess[] = [
    { name: 'Tomar Asistencia', icon: 'clipboard', route: '/asistencia' },
    { name: 'Aplicar Evaluación', icon: 'clipboard', route: '/evaluacion' },
    { name: 'Nueva Planificación', icon: 'calendar', route: '/planificacion' },
    { name: 'Matricular Estudiante', icon: 'user-plus', route: '/estudiantes' }
  ];

  announcements: Announcement[] = [
    {
      title: 'Reunión de Profesores',
      message: 'Mañana a las 10:00 en la Sala de Profesores.',
      type: 'warning',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-400',
      textColor: 'text-yellow-800'
    },
    {
      title: 'Nuevo Sistema de Evaluación',
      message: 'Ya está disponible la guía en la sección de Planificación.',
      type: 'info',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-400',
      textColor: 'text-blue-800'
    }
  ];

  nextClass = {
    subject: 'Historia - 7º Básico B',
    location: 'Sala 203, 14:00 - 15:00'
  };

  ngOnInit() {
    this.setGreeting();
  }

  setGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
      this.greeting = 'Buenos días';
    } else if (hour < 20) {
      this.greeting = 'Buenas tardes';
    } else {
      this.greeting = 'Buenas noches';
    }
  }

  startClass() {
    console.log('Iniciando clase:', this.nextClass.subject);
  }

  navigateTo(route: string) {
    console.log('Navegando a:', route);
  }
}
