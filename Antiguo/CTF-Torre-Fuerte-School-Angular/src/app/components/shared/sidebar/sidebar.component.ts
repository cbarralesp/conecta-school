import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  active?: boolean;
  children?: NavItem[];  // Para subitems
  expanded?: boolean;    // Para controlar el dropdown
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  navItems: NavItem[] = [
    {
      label: 'Inicio',
      route: '/home',
      icon: 'home',
      active: true
    },
    {
      label: 'Planificación',
      route: '/planificacion',
      icon: 'calendar'
    },
    {
      label: 'Evaluación',
      route: '/evaluacion',
      icon: 'clipboard'
    },
    {
      label: 'Libro de Clases',
      route: '/libro-clases',
      icon: 'book',
      expanded: false,
      children: [
        {
          label: 'Asistencia',
          route: '/libro-clases/asistencia',
          icon: 'clipboard'
        }
      ]
    },
    {
      label: 'Matriculas',
      route: '/matricula',
      icon: 'matricula'
    },
    {
      label: 'Horario',
      route: '/horario',
      icon: 'clock'
    }
  ];

  setActive(item: NavItem) {
    this.navItems.forEach(navItem => navItem.active = false);
    item.active = true;
  }

  toggleDropdown(item: NavItem, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (item.children && item.children.length > 0) {
      item.expanded = !item.expanded;
    }
  }
}
