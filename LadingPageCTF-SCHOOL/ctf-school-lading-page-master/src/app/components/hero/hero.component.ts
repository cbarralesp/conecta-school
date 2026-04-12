import { Component } from '@angular/core';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss']
})
export class HeroComponent {
  stats = [
    { value: '25+', label: 'Años de Excelencia' },
    { value: '800+', label: 'Estudiantes' },
    { value: '100%', label: 'Excelencia Educativa' }
  ];

  scrollToContact() {
    const element = document.getElementById('contacto');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
