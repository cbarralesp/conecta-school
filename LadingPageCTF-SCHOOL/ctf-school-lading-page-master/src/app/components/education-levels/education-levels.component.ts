import { Component } from '@angular/core';

@Component({
  selector: 'app-education-levels',
  templateUrl: './education-levels.component.html',
  styleUrls: ['./education-levels.component.scss']
})
export class EducationLevelsComponent {
  levels = [
    {
      title: 'Preescolar',
      age: '3-5 años',
      color: 'blue',
      description: 'Ambiente cálido y estimulante donde los niños desarrollan habilidades fundamentales a través del juego y la exploración.',
      features: [
        'Desarrollo de habilidades motoras',
        'Estimulación temprana',
        'Socialización y valores',
        'Introducción a la lectoescritura'
      ]
    },
    {
      title: 'Primaria',
      age: '6-11 años',
      color: 'green',
      description: 'Educación integral que fortalece conocimientos académicos y desarrolla el pensamiento crítico y creativo.',
      features: [
        'Currículo bilingüe',
        'Matemáticas avanzadas',
        'Ciencias y tecnología',
        'Desarrollo artístico y deportivo'
      ]
    },
    {
      title: 'Secundaria',
      age: '12-15 años',
      color: 'purple',
      description: 'Preparación académica rigurosa que equipa a los estudiantes para la excelencia universitaria y la vida profesional.',
      features: [
        'Preparación universitaria',
        'Liderazgo y emprendimiento',
        'Proyectos de investigación',
        'Orientación vocacional'
      ]
    }
  ];

  getColorClasses(color: string) {
    const colors: any = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600'
    };
    return colors[color];
  }
}
