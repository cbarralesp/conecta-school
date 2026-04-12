import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  searchQuery = '';
  userName = 'Profesor';
  userAvatar = 'https://i.pravatar.cc/40?img=60';
  hasNotifications = true;
  notificationCount = 3;

  constructor(private router: Router) {}

  ngOnInit() {}

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    console.log('Buscando:', this.searchQuery);
    // Aquí implementarás la lógica de búsqueda
  }

  onNotificationClick() {
    console.log('Mostrando notificaciones');
    // Aquí implementarás la lógica de notificaciones
  }

  onProfileClick() {
    console.log('Navegando al perfil');
    this.router.navigate(['/perfil']);
  }

  onLogout() {
    console.log('Cerrando sesión');
    this.router.navigate(['/login']);
  }
}
