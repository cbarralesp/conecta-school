import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/shared/layout/layout.component';
import { HomeComponent } from './components/home/home.component';
import { MatriculaComponent } from './components/matricula/matricula.component';
import { Prueba2Component } from './components/prueba2/prueba2.component';
import { HorarioComponent } from './components/horario/horario.component';
import { GestionAsignaturasComponent } from './components/gestion-asignaturas/gestion-asignaturas.component';
import { LibroClasesComponent } from './components/libro-clases/libro-clases.component';
import { MisCursosComponent } from './components/mis-cursos/mis-cursos.component';
import { AsistenciaComponent } from './components/asistencia/asistencia.component';
import { ConsultarAsistenciaComponent } from './components/asistencia/consultar-asistencia/consultar-asistencia.component';
import { CalificacionesComponent } from './components/calificaciones/calificaciones.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'prueba2',
    component: Prueba2Component
  },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'planificacion', component: HomeComponent }, // Temporal
      { path: 'evaluacion', component: HomeComponent }, // Temporal
      { path: 'libro-clases', component: LibroClasesComponent },
      { path: 'libro-clases/asistencia', component: AsistenciaComponent }, // Ruta anidada
      { path: 'asistencia/consultar-asistencia', component: ConsultarAsistenciaComponent },
      { path: 'horario', component: HorarioComponent },
      { path: 'gestion-asignaturas', component: GestionAsignaturasComponent },
      { path: 'perfil', component: HomeComponent }, // Temporal
      { path: 'matricula', component: MatriculaComponent },
      { path: 'mis-cursos', component: MisCursosComponent },
      { path: 'calificaciones', component: CalificacionesComponent },
    ]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
