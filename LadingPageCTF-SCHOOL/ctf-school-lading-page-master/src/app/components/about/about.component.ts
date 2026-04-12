import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  values = [
    {
      icon: 'shield',
      title: 'Fe',
      description: 'Basamos nuestra educación en la fe en Jesucristo, guía fundamental de nuestra comunidad.'
    },
    {
      icon: 'heart',
      title: 'Amor',
      description: 'Cultivamos el amor entre todos los miembros de nuestra familia educativa.'
    },
    {
      icon: 'target',
      title: 'Respeto',
      description: 'Fomentamos el respeto mutuo como base de una convivencia sana y armoniosa.'
    },
    {
      icon: 'lightbulb',
      title: 'Integridad',
      description: 'Formamos personas íntegras con principios éticos que perdurarán toda la vida.'
    }
  ];
}