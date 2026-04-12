# Mapa Del Sistema Escolar

## 1. Resumen General

Este sistema escolar está dividido en 3 capas principales:

- Frontend Angular
- Backend Spring Boot con enfoque hexagonal
- Base de datos PostgreSQL

Workspaces principales:

- Frontend: `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar`
- Backend: `C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar`
- Scripts SQL y utilidades: `C:\Users\Diegazzo\Desktop\Desarrollo`

Base de datos actual:

- Motor: PostgreSQL
- Base: `sistema_escolar`

## 2. Frontend

### 2.1 Stack

- Angular
- Angular Material
- Arquitectura por features
- Servicios API centralizados en `src/app/core/services`

### 2.2 Archivo de rutas

- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\app.routes.ts`

### 2.3 Sidebar

- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\shared\teacher-side-menu.component.ts`

### 2.4 Servicios API principales

- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\core\services\teacher-api.service.ts`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\core\services\course-api.service.ts`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\core\services\schedule-api.service.ts`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\core\services\attendance-api.service.ts`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\core\services\subject-api.service.ts`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\core\services\activity-calendar-api.service.ts`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\core\services\grade-api.service.ts`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\core\services\enrollment-api.service.ts`

### 2.5 Normalización transversal de texto

Se agregó una utilidad para limpiar textos heredados o con codificación visual rara en el borde del frontend, sin meter esa lógica en componentes.

- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\core\utils\text-normalizer.ts`

### 2.6 Features actuales

- Resumen
- Matrículas
- Crear curso
- Cursos
- Horario
- Asignaturas
- Asistencia
- Actividades
- Calificaciones
- Profesores

Paths principales:

- `src/app/features/enrollments`
- `src/app/features/courses`
- `src/app/features/schedule`
- `src/app/features/subjects`
- `src/app/features/attendance`
- `src/app/features/activities`
- `src/app/features/grades`
- `src/app/features/teachers`

## 3. Backend

### 3.1 Stack

- Spring Boot
- Spring Security con JWT
- JdbcTemplate
- Organización hexagonal

### 3.2 Configuración principal

- `C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar\src\main\resources\application.yml`

### 3.3 Estructura hexagonal

- `domain/model`: modelos de negocio
- `domain/port/in`: casos de uso
- `domain/port/out`: puertos de persistencia o integración
- `application/service`: implementación de casos de uso
- `infrastructure/adapter/in/web`: controllers y DTOs
- `infrastructure/adapter/out/persistence`: adapters JDBC
- `infrastructure/security`: JWT y seguridad

### 3.4 Controllers principales

- `TeacherController.java`
- `CourseController.java`
- `ScheduleController.java`
- `AttendanceController.java`
- `GradesController.java`
- `EnrollmentController.java`
- `SubjectController.java`

Ubicación:

- `C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar\src\main\java\com\example\authhexagonal\infrastructure\adapter\in\web`

### 3.5 Adapters JDBC principales

- `TeacherJdbcAdapter.java`
- `CourseJdbcAdapter.java`
- `AcademicManagementJdbcAdapter.java`
- `AttendanceJdbcAdapter.java`
- `GradesJdbcAdapter.java`
- `EnrollmentJdbcAdapter.java`

Ubicación:

- `C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar\src\main\java\com\example\authhexagonal\infrastructure\adapter\out\persistence`

## 4. Base De Datos

### 4.1 Tablas núcleo

- `PERSONAS`
- `USUARIOS`
- `PROFESORES`
- `ALUMNOS`
- `CURSOS`
- `ASIGNATURAS`

### 4.2 Relaciones importantes

- `PROFESORES.PERSONA_ID -> PERSONAS.ID`
- `USUARIOS.PERSONA_ID -> PERSONAS.ID`
- `MATRICULAS -> ALUMNOS / CURSOS`
- `CARGAS_DOCENTES -> PROFESORES / CURSOS / ASIGNATURAS`
- `HORARIOS_CARGAS -> CARGAS_DOCENTES`
- `CURSO_DOCENTES -> PROFESORES / CURSOS`
- `PROFESOR_ASIGNATURAS -> PROFESORES / ASIGNATURAS`

### 4.3 Dominio docente

Tablas relevantes:

- `PROFESORES`
- `CARGAS_DOCENTES`
- `HORARIOS_CARGAS`
- `CURSO_DOCENTES`
- `PROFESOR_ASIGNATURAS`
- `PROFESOR_CONTACTOS_EMERGENCIA`

### 4.4 Dominio matrículas

Tablas relevantes:

- `MATRICULAS`
- `MATRICULA_APODERADOS`
- `MATRICULA_RETIRO_RESPONSABLES`

### 4.5 Dominio asistencia

Definido y poblado por:

- `C:\Users\Diegazzo\Desktop\Desarrollo\asistencia_escolar.sql`

### 4.6 Dominio calificaciones

Definido y poblado por:

- `C:\Users\Diegazzo\Desktop\Desarrollo\calificaciones_escolar.sql`

### 4.7 Dominio profesores

Scripts relevantes:

- `C:\Users\Diegazzo\Desktop\Desarrollo\profesores_modulo_escolar.sql`
- `C:\Users\Diegazzo\Desktop\Desarrollo\profesores_backfill_existentes.sql`

## 5. Fuente De Verdad Actual Por Dominio

### 5.1 Profesores y asignaturas impartidas

Fuente de verdad principal:

- `CARGAS_DOCENTES`

Tabla resumen o compatibilidad:

- `PROFESOR_ASIGNATURAS`

Notas:

- `PROFESOR_ASIGNATURAS` se sincronizó desde `CARGAS_DOCENTES`
- el módulo Profesores debe priorizar carga real

### 5.2 Horarios

Fuente de verdad principal:

- `HORARIOS_CARGAS` + `CARGAS_DOCENTES`

### 5.3 Cursos

Fuente de verdad principal:

- `CURSOS`

### 5.4 Asignaturas

Fuente de verdad principal:

- `ASIGNATURAS`

### 5.5 Matrículas

Fuente de verdad principal:

- `MATRICULAS`
- `MATRICULA_APODERADOS`
- `MATRICULA_RETIRO_RESPONSABLES`

### 5.6 Profesores catálogo legacy

Tabla legacy:

- `PROFESORES_CATALOGO`

Uso actual:

- compatibilidad con flujos antiguos, por ejemplo Crear curso

Regla:

- no debería ser fuente final
- hoy está sincronizada con `PROFESORES` para no romper módulos legacy

## 6. Scripts De Alineación Aplicados

Estos scripts ya se usaron para ordenar la plataforma:

- `C:\Users\Diegazzo\Desktop\Desarrollo\alineacion_docentes_escolar.sql`
- `C:\Users\Diegazzo\Desktop\Desarrollo\sincroniza_profesor_asignaturas_desde_cargas.sql`
- `C:\Users\Diegazzo\Desktop\Desarrollo\consolida_docentes_duplicados.sql`
- `C:\Users\Diegazzo\Desktop\Desarrollo\sincroniza_profesores_catalogo_legacy.sql`
- `C:\Users\Diegazzo\Desktop\Desarrollo\normaliza_docentes_personales.sql`

## 7. Estado Actual Validado

Pruebas funcionales ya validadas recientemente:

- login: OK
- `GET /api/profesores`: OK
- `GET /api/profesores/1`: OK
- `GET /api/profesores-catalogo`: OK
- `GET /api/horarios/catalogo`: OK funcionalmente
- `npm run build`: OK en frontend

## 8. Problemas O Consideraciones Detectadas

### 8.1 Legacy mezclado con modelo nuevo

Todavía existen piezas legacy conviviendo con el modelo más nuevo.

Ejemplo:

- `PROFESORES_CATALOGO` convive con `PROFESORES`
- algunos módulos aún toleran o consumen estructuras heredadas

### 8.2 Texto visible con codificación rara

No se detectó mojibake persistido directamente en `CURSOS`, `ASIGNATURAS` o `PERSONAS`, pero algunas respuestas o consumos pueden mostrar caracteres raros según la decodificación del cliente.

Mitigación actual:

- `text-normalizer.ts`
- normalización aplicada en servicios del frontend

### 8.3 Identidad real

No conviene inventar ni modificar RUNs o identidades reales si no existe una fuente confiable.

Ejemplo:

- se corrigieron datos claramente heredados como correos institucionales
- no se forzaron RUNs dudosos

## 9. Recomendaciones Para Otra IA

Si otra IA toma este proyecto, debería seguir estas reglas:

- respetar la arquitectura hexagonal del backend
- no mover lógica de limpieza a componentes del frontend
- mantener la normalización en servicios/adapters del borde
- priorizar `CARGAS_DOCENTES` como fuente real de docencia
- usar `PROFESORES_CATALOGO` solo como compatibilidad temporal
- no romper rutas existentes
- no inventar identidad personal si no hay evidencia

## 10. Prompt Base Recomendado Para Otra IA

Puedes pasarle este texto:

> Estoy trabajando sobre un sistema escolar con Angular frontend, Spring Boot hexagonal backend y PostgreSQL.
> 
> Frontend:
> `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar`
> 
> Backend:
> `C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar`
> 
> Base:
> `sistema_escolar`
> 
> La fuente de verdad docente actual es `CARGAS_DOCENTES`.
> `PROFESOR_ASIGNATURAS` y `PROFESORES_CATALOGO` son capas resumen o compatibilidad.
> 
> Revisa especialmente:
> - `TeacherJdbcAdapter`
> - `CourseJdbcAdapter`
> - `AcademicManagementJdbcAdapter`
> - `teacher-api.service`
> - `course-api.service`
> - `schedule-api.service`
> 
> Ya se consolidaron docentes duplicados y se sincronizaron tablas legacy.
> 
> Necesito que mantengas clean code, hexagonal, consistencia entre frontend, backend y base de datos, sin romper rutas existentes.

## 11. Archivo Generado

Este documento fue generado para transferencia técnica y continuidad del proyecto.
