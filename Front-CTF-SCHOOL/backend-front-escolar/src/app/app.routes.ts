import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';

const teacherOrAdmin = ['TEACHER', 'ADMIN'] as const;
const adminOnly = ['ADMIN'] as const;
const studentOnly = ['STUDENT'] as const;

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login-page.component').then((m) => m.LoginPageComponent)
  },
  {
    path: 'profesor',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard-page.component').then(
        (m) => m.DashboardPageComponent
      )
  },
  {
    path: 'administracion',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/administration/pages/administration-shell-redirect.component').then(
        (m) => m.AdministrationShellRedirectComponent
      )
  },
  {
    path: 'alumno',
    canActivate: [authGuard, roleGuard],
    data: { roles: studentOnly, section: 'overview' },
    loadComponent: () =>
      import('./features/student/pages/student-dashboard-page.component').then(
        (m) => m.StudentDashboardPageComponent
      )
  },
  {
    path: 'alumno/cursos',
    canActivate: [authGuard, roleGuard],
    data: { roles: studentOnly, section: 'courses' },
    loadComponent: () =>
      import('./features/student/pages/student-dashboard-page.component').then(
        (m) => m.StudentDashboardPageComponent
      )
  },
  {
    path: 'alumno/asignaturas',
    canActivate: [authGuard, roleGuard],
    data: { roles: studentOnly, section: 'subjects' },
    loadComponent: () =>
      import('./features/student/pages/student-dashboard-page.component').then(
        (m) => m.StudentDashboardPageComponent
      )
  },
  {
    path: 'alumno/asignaturas/:subjectId/documentos',
    canActivate: [authGuard, roleGuard],
    data: { roles: studentOnly, section: 'subjects' },
    loadComponent: () =>
      import('./features/student/pages/student-subject-documents.component').then(
        (m) => m.StudentSubjectDocumentsComponent
      )
  },
  {
    path: 'alumno/horario',
    canActivate: [authGuard, roleGuard],
    data: { roles: studentOnly, section: 'schedule' },
    loadComponent: () =>
      import('./features/student/pages/student-dashboard-page.component').then(
        (m) => m.StudentDashboardPageComponent
      )
  },
  {
    path: 'alumno/calificaciones',
    canActivate: [authGuard, roleGuard],
    data: { roles: studentOnly, section: 'grades' },
    loadComponent: () =>
      import('./features/student/pages/student-dashboard-page.component').then(
        (m) => m.StudentDashboardPageComponent
      )
  },
  {
    path: 'alumno/asistencia',
    canActivate: [authGuard, roleGuard],
    data: { roles: studentOnly, section: 'attendance' },
    loadComponent: () =>
      import('./features/student/pages/student-attendance-page.component').then(
        (m) => m.StudentAttendancePageComponent
      )
  },
  {
    path: 'alumno/actividades',
    canActivate: [authGuard, roleGuard],
    data: { roles: studentOnly, section: 'activities', readOnly: true },
    loadComponent: () =>
      import('./features/activities/pages/activities-calendar-page.component').then(
        (m) => m.ActivitiesCalendarPageComponent
      )
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard-page.component').then(
        (m) => m.DashboardPageComponent
      )
  },
  {
    path: 'dashboard/moderno',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin, layoutVariant: 'modern-teacher' },
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard-page.component').then(
        (m) => m.DashboardPageComponent
      )
  },
  {
    path: 'dashboard/planning/:id',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/dashboard/pages/planning-detail-page.component').then(
        (m) => m.PlanningDetailPageComponent
      )
  },
  {
    path: 'dashboard/planificacion',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/planning/pages/planning-overview-page.component').then(
        (m) => m.PlanningOverviewPageComponent
      )
  },
  {
    path: 'dashboard/planificacion/nueva-unidad',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/planning/pages/planning-unit-create.component').then(
        (m) => m.PlanningUnitCreateComponent
      )
  },
  {
    path: 'dashboard/planificacion/nueva-clase',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/planning/pages/planning-class-create.component').then(
        (m) => m.PlanningClassCreateComponent
      )
  },
  {
    path: 'dashboard/planificacion/clases/:id/editar',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/planning/pages/planning-class-create.component').then(
        (m) => m.PlanningClassCreateComponent
      )
  },
  {
    path: 'dashboard/planificacion/documentos',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/planning/pages/planning-documents.component').then(
        (m) => m.PlanningDocumentsComponent
      )
  },
  {
    path: 'dashboard/cursos',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/courses/pages/courses-page.component').then((m) => m.CoursesPageComponent)
  },
  {
    path: 'dashboard/matriculas',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/enrollments/pages/enrollments-page.component').then(
        (m) => m.EnrollmentsPageComponent
      )
  },
  {
    path: 'dashboard/profesores',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/teachers/pages/teachers-page.component').then(
        (m) => m.TeachersPageComponent
      )
  },
  {
    path: 'dashboard/profesores/nuevo',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/teachers/pages/teacher-form-page.component').then(
        (m) => m.TeacherFormPageComponent
      )
  },
  {
    path: 'dashboard/profesores/:id',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/teachers/pages/teacher-detail-page.component').then(
        (m) => m.TeacherDetailPageComponent
      )
  },
  {
    path: 'dashboard/profesores/:id/editar',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/teachers/pages/teacher-form-page.component').then(
        (m) => m.TeacherFormPageComponent
      )
  },
  {
    path: 'dashboard/matriculas/nueva',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/enrollments/pages/enrollment-form-page.component').then(
        (m) => m.EnrollmentFormPageComponent
      )
  },
  {
    path: 'dashboard/matriculas/:id',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/enrollments/pages/enrollment-detail-page.component').then(
        (m) => m.EnrollmentDetailPageComponent
      )
  },
  {
    path: 'dashboard/matriculas/:id/editar',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/enrollments/pages/enrollment-form-page.component').then(
        (m) => m.EnrollmentFormPageComponent
      )
  },
  {
    path: 'dashboard/cursos/nuevo',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/courses/pages/create-course-page.component').then(
        (m) => m.CreateCoursePageComponent
      )
  },
  {
    path: 'dashboard/cursos/:id/editar',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/courses/pages/edit-course-page.component').then(
        (m) => m.EditCoursePageComponent
      )
  },
  {
    path: 'dashboard/cursos/:id/alumnos',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/courses/pages/course-students-page.component').then(
        (m) => m.CourseStudentsPageComponent
      )
  },
  {
    path: 'dashboard/horario',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/schedule/pages/schedule-page.component').then((m) => m.SchedulePageComponent)
  },
  {
    path: 'dashboard/asignaturas',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/subjects/pages/subjects-page.component').then((m) => m.SubjectsPageComponent)
  },
  {
    path: 'dashboard/actividades',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin, readOnly: false },
    loadComponent: () =>
      import('./features/activities/pages/activities-calendar-page.component').then(
        (m) => m.ActivitiesCalendarPageComponent
      )
  },
  {
    path: 'dashboard/contenido',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/content/pages/content-page.component').then((m) => m.ContentPageComponent)
  },
  {
    path: 'dashboard/asistencia',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/attendance/pages/attendance-page.component').then(
        (m) => m.AttendancePageComponent
      )
  },
  {
    path: 'dashboard/calificaciones',
    canActivate: [authGuard, roleGuard],
    data: { roles: teacherOrAdmin },
    loadComponent: () =>
      import('./features/grades/pages/grades-page.component').then((m) => m.GradesPageComponent)
  },
  {
    path: 'dashboard/administracion',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/administration/pages/administration-shell-redirect.component').then(
        (m) => m.AdministrationShellRedirectComponent
      )
  },
  {
    path: 'dashboard/administracion/usuarios',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/administration/pages/administration-users-page.component').then(
        (m) => m.AdministrationUsersPageComponent
      )
  },
  {
    path: 'dashboard/administracion/roles',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/administration/pages/administration-roles-page.component').then(
        (m) => m.AdministrationRolesPageComponent
      )
  },
  {
    path: 'dashboard/administracion/matriz-acceso',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/administration/pages/administration-access-matrix-page.component').then(
        (m) => m.AdministrationAccessMatrixPageComponent
      )
  },
  {
    path: 'dashboard/administracion/nuevo-usuario',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/administration/pages/administration-user-create-page.component').then(
        (m) => m.AdministrationUserCreatePageComponent
      )
  },
  {
    path: 'dashboard/administracion/auditoria',
    canActivate: [authGuard, roleGuard],
    data: { roles: adminOnly },
    loadComponent: () =>
      import('./features/administration/pages/administration-audit-page.component').then(
        (m) => m.AdministrationAuditPageComponent
      )
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
