# AI Handoff

## Proyecto

- Workspace: `C:\Users\Diegazzo\Desktop\Desarrollo`
- Frontend: `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar`
- Backend: `C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar`
- Stack frontend: Angular + Angular Material
- Stack backend: Spring Boot + arquitectura hexagonal + JdbcTemplate
- Base de datos: PostgreSQL

## Objetivo general del sistema

Sistema escolar con módulos de:

- administración
- matrículas
- profesores
- cursos
- asignaturas
- horario
- asistencia
- calificaciones
- planificación
- portal estudiante

## Convenciones importantes

- No rehacer lógica backend si no es necesario
- No cambiar endpoints existentes si ya funcionan
- Mantener arquitectura por features en frontend
- Mantener clean code
- Reutilizar módulos existentes cuando sea posible
- En UI, tomar como referencia visual los módulos más estables del sistema

## Estándar visual definido

### Toolbar

La referencia principal es `Administración`.

Toolbar estándar:

- altura: `var(--app-toolbar-height)`
- padding horizontal: `var(--app-toolbar-padding-x)`
- fondo: `var(--app-toolbar-background)`
- borde inferior suave
- tipografía común para títulos y acciones

### Banner / Hero

El sistema quedó estandarizado con variables globales en:

- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\styles.scss`

Variables relevantes:

- `--app-banner-min-height`
- `--app-banner-padding-y`
- `--app-banner-padding-x`
- `--app-banner-gap`
- `--app-banner-title-size`
- `--app-banner-copy-size`
- `--app-radius-hero`
- `--app-gradient-hero`

Referencia visual correcta:

- banners tipo `Asignaturas`, `Cursos`, `Profesores`

## Cambios globales ya realizados

### Lenguaje visible

Se cambió el lenguaje visible de `alumno` a `estudiante` en la UI, sin cambiar rutas técnicas ni endpoints para no romper integración.

### Toolbars y banners

Se centralizó tipografía y spacing en:

- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\styles.scss`

Se estandarizaron:

- tipografía del toolbar
- padding y gap del toolbar
- alto visual del toolbar
- escala tipográfica de banners
- padding y altura de banners

## Módulos trabajados recientemente

### Portal estudiante

Se trabajó en:

- documentos por asignatura
- asistencia
- actividades
- calificaciones

### Actividades

Archivo principal:

- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\features\activities\pages\activities-calendar-page.component.html`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\features\activities\pages\activities-calendar-page.component.scss`

Estado actual:

- modo estudiante: solo lectura
- toolbar estudiante diferenciado pero con tipografía estándar
- modo docente: hero ajustado al estándar del sistema
- banner de actividades fue corregido para usar el mismo contrato visual del hero estándar

### Planificación

Archivo principal:

- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\features\planning\pages\planning-overview-page.component.html`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\features\planning\pages\planning-overview-page.component.scss`

Estado actual:

- toolbar refactorizado para parecerse al estándar de `Administración`
- título principal movido a banner separado
- hero de planificación corregido para dejar de verse cuadrado

### Asistencia estudiante

Archivos:

- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\features\student\pages\student-attendance-page.component.html`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\features\student\pages\student-attendance-page.component.scss`

Notas:

- el usuario reportó varias veces problemas de sidebar y toolbar
- se ajustó para acercarlo al estándar del portal estudiante
- si vuelve a revisarse, comparar visualmente contra `Calificaciones` del portal estudiante

## Backend trabajado recientemente

### Portal estudiante: documentos por asignatura

Se implementó funcionalidad para que un estudiante vea materiales publicados por el profesor.

Incluye:

- listado de asignaturas del estudiante
- detalle de documentos por asignatura
- tracking de documento revisado

Tablas reutilizadas:

- `UNIDADES_PLANIFICACION`
- `CLASES_PLANIFICACION`
- `CLASES_PLANIFICACION_DOCUMENTOS`

Tabla nueva propuesta/creada:

- `ALUMNO_DOCUMENTO_ESTADO`

## Datos de prueba creados

Se generaron credenciales y datos para validación manual.

### Estudiante de Nicole

- usuario: `alumno.nicole`
- clave: `Alumno2026*`

### Estudiante mherrera

- usuario: `mherrera`
- clave: `Herrera2026*`

Se sembraron materiales visibles para alumno/estudiante asociados a publicaciones de Nicole.

## Repositorio Git

Repositorio remoto:

- [https://github.com/cbarralesp/conecta-school.git](https://github.com/cbarralesp/conecta-school.git)

Rama principal:

- `main`

## Validación habitual usada

Para validar frontend:

```powershell
npm run build
```

Ubicación:

```powershell
C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar
```

## Warnings conocidos

Persisten warnings antiguos del proyecto:

- budget en `student-dashboard-page.component.scss`
- budget en `activities-calendar-page.component.scss`
- CommonJS warnings por `html2canvas`, `canvg` y dependencias relacionadas

Estos warnings no están bloqueando build actualmente.

## Qué revisar primero si otra IA continúa

1. Comparar visualmente cualquier pantalla nueva contra `Administración` para toolbar.
2. Comparar banners contra `Asignaturas` o `Cursos`, no contra implementaciones intermedias.
3. Si algo “se ve distinto”, revisar primero:
   - estructura HTML
   - clase del toolbar
   - clase del banner/hero
   - padding del contenedor principal
4. No cambiar rutas o endpoints sin necesidad.
5. Si se toca frontend, validar con `npm run build`.

## Archivo sugerido para seguir trabajando

Este archivo puede compartirse directamente con otra IA como contexto inicial:

- `C:\Users\Diegazzo\Desktop\Desarrollo\AI_HANDOFF.md`
