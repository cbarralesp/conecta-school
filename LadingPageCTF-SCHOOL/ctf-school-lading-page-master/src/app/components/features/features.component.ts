import { Component } from '@angular/core';

@Component({
  selector: 'app-features',
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.scss']
})
export class FeaturesComponent {
  features = [
    {
      icon: 'globe',
      title: 'Educación Bilingüe',
      description: 'Programa intensivo de inglés que prepara a los estudiantes para un mundo globalizado.'
    },
    {
      icon: 'laptop',
      title: 'Tecnología Educativa',
      description: 'Laboratorios equipados con tecnología de punta para el aprendizaje del siglo XXI.'
    },
    {
      icon: 'trophy',
      title: 'Deportes',
      description: 'Programa deportivo completo que desarrolla el trabajo en equipo y la disciplina.'
    },
    {
      icon: 'music',
      title: 'Artes Musicales',
      description: 'Desarrollamos el talento artístico con clases de música, canto y expresión.'
    },
    {
      icon: 'palette',
      title: 'Artes Plásticas',
      description: 'Fomentamos la creatividad a través de diferentes disciplinas artísticas.'
    },
    {
      icon: 'flask',
      title: 'Laboratorios STEM',
      description: 'Espacios equipados para experimentación científica y proyectos de innovación.'
    }
  ];
}
