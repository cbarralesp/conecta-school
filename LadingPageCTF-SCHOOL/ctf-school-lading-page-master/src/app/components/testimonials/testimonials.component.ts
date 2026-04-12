import { Component } from '@angular/core';

@Component({
  selector: 'app-testimonials',
  templateUrl: './testimonials.component.html',
  styleUrls: ['./testimonials.component.scss']
})
export class TestimonialsComponent {
  testimonials = [
    {
      name: 'María González',
      role: 'Madre de familia',
      text: 'Torre Fuerte no solo educa académicamente a mi hija, sino que también ha formado su carácter. Estoy muy agradecida por el ambiente positivo y los valores que transmiten.',
      rating: 5
    },
    {
      name: 'Roberto Martínez',
      role: 'Padre de familia',
      text: 'La preparación académica que reciben mis hijos es excepcional. Los profesores están comprometidos y siempre disponibles para apoyar el desarrollo de cada estudiante.',
      rating: 5
    },
    {
      name: 'Ana Rodríguez',
      role: 'Ex-alumna',
      text: 'Torre Fuerte me preparó no solo para la universidad, sino para la vida. Los valores y la formación integral que recibí siguen siendo mi base en todo lo que hago.',
      rating: 5
    }
  ];
}
