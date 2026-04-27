# Handoff IA - Estado del Proyecto

Fecha: 2026-04-26

## Repositorio

- Monorepo raiz: `C:\Users\Diegazzo\Desktop\Desarrollo`
- Frontend Angular: `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar`
- Backend Java: `C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar`

## Resumen Ejecutivo

Se avanzó fuerte en la migración visual y funcional de los módulos académicos y administrativos al layout moderno del sistema. El foco principal fue:

- unificar `sidebar`, `toolbar`, márgenes y espaciados
- homologar filtros e inputs con el lenguaje visual de `Contenido` y `Planificación`
- modernizar vistas de listado, detalle y edición
- conectar lo posible a backend real sin romper flujos existentes

## Estado por Módulo

### 1. Administración

#### Shell de administración

Archivo clave:

- `Front-CTF-SCHOOL/backend-front-escolar/src/app/features/administration/components/administration-shell.component.ts`

Cambios:

- La shell antigua de administración fue reemplazada por el layout moderno compartido.
- Ahora usa `app-teacher-modern-layout`.
- El `sidebar` principal es el mismo del resto del sistema.
- La navegación interna de administración quedó como subbarra debajo del toolbar.
- Se respetaron márgenes, anchos y comportamiento responsive del resto de módulos.

#### Usuarios

Archivos:

- `.../administration-users-page.component.ts`
- `.../administration-users-page.component.html`
- `.../administration-users-page.component.scss`

Cambios:

- Rediseño completo de la pantalla `Usuarios`.
- Cards de resumen nuevas.
- Barra de filtros con shells modernas:
  - búsqueda
  - rol
  - estado
- Tabla moderna manteniendo lógica real:
  - carga desde backend
  - filtros activos
  - acciones por fila
  - estados vacíos y carga
- Se mantuvo funcional:
  - ver detalle
  - editar
  - bloquear/desbloquear
  - activar/desactivar
  - eliminar

Notas:

- Se agregó `summaryCards` para traducir métricas al nuevo UI.
- Se agregó `rolePillClass()` para colores por rol.

#### Roles

Archivos:

- `.../administration-roles-page.component.ts`
- `.../administration-roles-page.component.html`
- `.../administration-roles-page.component.scss`
- `.../components/administration-role-card.component.ts`

Cambios:

- Se eliminó el hero anterior.
- Se reemplazó por header simple alineado con `Usuarios`.
- Se agregaron cards de resumen arriba.
- Se modernizó la grilla de roles.
- Se reescribió `administration-role-card.component.ts` porque tenía texto con codificación dañada.

Notas:

- La card de rol ahora respeta radios, alturas, separación y CTA del sistema moderno.

#### Matriz de acceso

Archivos:

- `.../administration-access-matrix-page.component.ts`
- `.../administration-access-matrix-page.component.html`
- `.../administration-access-matrix-page.component.scss`

Cambios:

- Se rediseñó completo el módulo.
- Ahora tiene dos vistas:
  - `Matriz`
  - `Usuario`
- Se agregaron cards de resumen.
- Se agregó switch visual de vista en header.
- Se agregó búsqueda de usuario real usando `AdministrationApiService.getUsersOverview({ search })`.
- Se agregó edición visual por clic para rotar permisos en matriz.
- Se agregó edición de excepciones por usuario en vista `Usuario`.
- `SUPERADMIN` queda bloqueado para no tocar el acceso total.
- Se implementó estado local de cambios (`matrixDirty`, `userDirty`).

Limitación importante:

- No se encontró endpoint claro de backend para persistir:
  - cambios de la matriz global
  - overrides por usuario
- Por eso el botón `Guardar` hoy:
  - no rompe nada
  - limpia banderas de dirty
  - muestra snackbar indicando que falta conectar backend

## 2. Profesores

Archivos relevantes:

- `.../features/teachers/pages/teachers-page.*`
- `.../teacher-form-page.*`
- `.../teacher-detail-page.*`

Cambios:

- `Editar Profesor` migrado al nuevo look solicitado.
- `Ver Profesor` migrado al nuevo diseño tipo ficha lateral.
- En edición de profesor:
  - la asignación de asignaturas ahora es checklist visual con checks
  - ya no depende del `select multiple` básico

## 3. Matrículas

Archivos relevantes:

- `.../enrollment-form-page.*`
- `.../enrollment-detail-page.*`

Cambios:

- `Editar Matrícula` migrado al nuevo diseño.
- `Ver Estudiante` migrado a ficha visual nueva.
- Se ajustó toolbar al estándar moderno.
- Se corrigió guardado para incluir campos exigidos por backend y no fallar en silencio.

## 4. Cursos

Archivos relevantes:

- `.../courses-page.*`
- `.../edit-course-page.*`
- `.../core/models/course.models.ts`

Cambios frontend:

- Página de cursos rediseñada manteniendo cards actuales donde el usuario lo pidió.
- Ajustes de spacing entre título y cards para alinear con otros módulos.
- En `Editar Curso` se agregaron selects reales para:
  - `Profesor jefe`
  - `Asistente`

Cambios backend relacionados:

- `Backend-CTF-SCHOOL/backend-api-escolar/src/main/java/com/example/authhexagonal/domain/model/Course.java`
- `.../domain/port/in/ManageCoursesUseCase.java`
- `.../application/service/CourseService.java`
- `.../in/web/CourseController.java`
- `.../dto/CourseRequest.java`
- `.../dto/CourseResponse.java`
- `.../out/persistence/CourseJdbcAdapter.java`

Resultado:

- El curso ahora soporta actualizar `teacherId` y `assistantId`.
- Permite mover un profesor de un curso a otro desde `Editar Curso`.

## 5. Horario

Archivo:

- `.../features/schedule/pages/schedule-page.component.ts`

Cambios:

- Se dejaron por defecto:
  - `Ensenanza Basica`
  - `Jornada Manana`

Otros cambios previos:

- Botones cercanos al título fueron reubicados a la línea de `Curso` y `Semestre` según pedido del usuario.

## 6. Contenido

Archivos:

- `.../features/content/pages/content-page.component.ts`
- `.../content-page.component.html`
- `.../content-page.component.scss`

Cambios:

- Se compactó la barra de filtros.
- `Semestre` fue movido al header superior derecho.
- Se agregó selector de `Asignatura`.
- `Formato` quedó más compacto.
- `Nueva Unidad` fue alineado sin romper la línea.
- Se corrigieron problemas de ancho excesivo del layout.

Funcionalidad real:

- El filtro por `Asignatura` usa `subjectId` real en la carga de contenido.

## 7. Planificación

Archivos relevantes:

- `.../planning-class-create.component.*`
- `.../planning-overview-page.component.*`
- backend planning en Java

Cambios visuales:

- Inputs superiores de planificación se llevaron al lenguaje visual de `Contenido`.
- `Mis Planificaciones` también se ajustó con filtros tipo shell.
- Se normalizó spacing entre header y cards.

Cambios funcionales:

- Se trabajó editar planificación como espejo de nueva planificación.
- Se agregó fallback de carga para editar cuando el backend no estuviera completamente reiniciado.

Cambios backend relevantes:

- Hay modificaciones en:
  - `PlanningClassService.java`
  - `PlanningClassController.java`
  - `PlanningObjectiveOption.java`
  - `PlanningObjectiveOptionResponse.java`
- También aparecen puertos nuevos no trackeados al inicio:
  - `GetPlanningClassUseCase.java`
  - `UpdatePlanningClassUseCase.java`
  - carpetas nuevas en `domain/port/out` e `infrastructure/adapter/out`

Nota:

- Revisar esos cambios antes de seguir porque forman parte del soporte nuevo de planificación.

## 8. Asignaturas

Archivo:

- `.../features/subjects/pages/subjects-page.component.scss`

Cambio:

- Se alineó la distancia entre título y cards con el resto de módulos.

## 9. Backend - Estado General

Hay cambios relevantes en backend además de cursos y planificación.

Archivos modificados vistos por `git status`:

- `CourseService.java`
- `PlanningClassService.java`
- `Course.java`
- `PlanningObjectiveOption.java`
- `ManageCoursesUseCase.java`
- `CourseController.java`
- `PlanningClassController.java`
- `CourseRequest.java`
- `CourseResponse.java`
- `PlanningObjectiveOptionResponse.java`

Archivos/carpetas nuevas:

- `GetPlanningClassUseCase.java`
- `UpdatePlanningClassUseCase.java`
- nuevas carpetas bajo:
  - `domain/port/out`
  - `infrastructure/adapter/out`

Advertencia:

- No se alcanzó a compilar backend con Maven desde esta máquina porque no estaba disponible `mvn`/`mvnw`.

## 10. Builds y Validaciones

Frontend:

- Se ejecutó `npm run build` varias veces durante el proceso.
- El build quedó pasando después de:
  - shell administración
  - usuarios
  - roles
  - matriz de acceso

Backend:

- Sin validación completa por falta de Maven en esta máquina.

## 11. Limitaciones / Pendientes Importantes

### Matriz de acceso

Pendiente backend:

- endpoint para guardar matriz global
- endpoint para guardar overrides por usuario

Recomendación:

- crear DTO para actualizar permisos por rol/módulo
- crear DTO para excepciones por usuario
- dejar `saveChanges()` del front llamando ambos endpoints

### Auditoría

- Aún no fue migrada al nuevo lenguaje visual.

### Nuevo usuario

- Sigue con la shell moderna ya migrada, pero no se rehízo visualmente al mismo nivel que `Usuarios`.

### Revisión de backend planificación

- revisar con cuidado los archivos nuevos de planificación antes de seguir tocando esa zona

## 12. Recomendación de Siguiente Paso

Orden sugerido:

1. Conectar guardado real de `Matriz de acceso` en backend.
2. Migrar `Auditoría`.
3. Refinar `Nuevo usuario` visualmente si se busca consistencia total.
4. Revisar y consolidar los cambios pendientes de backend en planificación.

## 13. Archivos más importantes tocados en esta etapa

### Front

- `src/app/features/administration/components/administration-shell.component.ts`
- `src/app/features/administration/components/administration-role-card.component.ts`
- `src/app/features/administration/pages/administration-users-page.component.ts`
- `src/app/features/administration/pages/administration-users-page.component.html`
- `src/app/features/administration/pages/administration-users-page.component.scss`
- `src/app/features/administration/pages/administration-roles-page.component.ts`
- `src/app/features/administration/pages/administration-roles-page.component.html`
- `src/app/features/administration/pages/administration-roles-page.component.scss`
- `src/app/features/administration/pages/administration-access-matrix-page.component.ts`
- `src/app/features/administration/pages/administration-access-matrix-page.component.html`
- `src/app/features/administration/pages/administration-access-matrix-page.component.scss`

### Backend

- `src/main/java/com/example/authhexagonal/application/service/CourseService.java`
- `src/main/java/com/example/authhexagonal/infrastructure/adapter/in/web/CourseController.java`
- `src/main/java/com/example/authhexagonal/infrastructure/adapter/in/web/dto/CourseRequest.java`
- `src/main/java/com/example/authhexagonal/infrastructure/adapter/in/web/dto/CourseResponse.java`
- `src/main/java/com/example/authhexagonal/infrastructure/adapter/out/persistence/CourseJdbcAdapter.java`

## 14. Nota para la próxima IA

Si vas a seguir desde aquí:

- no reviertas la shell de administración, ya está alineada al estándar nuevo
- en `Matriz de acceso`, el front ya está listo para UX; falta persistencia real
- en `Roles`, la card fue reescrita completa por un problema de codificación del archivo viejo
- el repo raíz es el monorepo completo, no solo el frontend
- antes de tocar backend de planificación, inspecciona bien los archivos nuevos no trackeados
