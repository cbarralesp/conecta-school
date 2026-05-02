# Checklist de guardado, edicion, eliminacion y validacion

Fecha de revision: 2026-04-30

## Estado general

- `OK`: flujo revisado y con validacion visible o persistencia probada
- `PARCIAL`: flujo funcional, pero aun con validacion visual o cobertura de prueba incompleta
- `BLOQUEADO`: hay un problema funcional conocido o un endpoint aun no conectado

## Modulos revisados

### Profesores
- `OK` Crear profesor
- `OK` Editar profesor
- `OK` Eliminar profesor
- `OK` Campos obligatorios marcados en rojo con mensajes
- `OK` Validacion backend de RUN duplicado corregida

### Matriculas
- `OK` Crear matricula
- `OK` Editar matricula
- `OK` Eliminar matricula
- `OK` Campos obligatorios marcados en rojo con mensajes
- `OK` Validacion backend de matricula activa corregida

### Cursos
- `OK` Crear curso
- `OK` Editar curso
- `OK` Eliminar curso
- `OK` Campos obligatorios visibles en crear y editar
- `OK` Persistencia validada con pruebas de backend

### Planificacion
- `OK` Crear unidad
- `PARCIAL` Crear clase
- `OK` Eliminar planificacion
- `OK` Campos clave visibles en unidad
- `PARCIAL` Campos clave visibles en clase
  - Cubiertos: titulo, asignatura, curso, unidad, fecha, inicio, desarrollo, cierre
  - Pendiente fino: algunos controles derivados como chips de evaluacion y selector OA no muestran error visual tan explicito como un `mat-error`

### Contenido
- `PARCIAL` Crear borrador de unidad
- `PARCIAL` Crear borrador de clase
- `PARCIAL` Editar unidad y clase dentro del tablero de contenido
- `PARCIAL` Validaciones presentes, pero mayormente apoyadas en snackbar y estado local

### Actividades
- `PARCIAL` Crear actividad
- `PARCIAL` Editar actividad
- `OK` Eliminar actividad
- `OK` Dialogo ahora muestra errores visibles en tipo, titulo y fecha

### Asignaturas
- `PARCIAL` Crear asignatura
- `PARCIAL` Editar asignatura
- `OK` Eliminar asignatura
- `OK` Dialogo ahora muestra errores visibles en codigo, nombre, area, color y horas

### Horarios
- `PARCIAL` Crear bloque horario
- `PARCIAL` Editar bloque horario
- `OK` Eliminar bloque horario
- `OK` Crear y editar recreo con errores visibles de hora
- `OK` Dialogo ahora muestra errores visibles en curso, bloque, asignatura, profesor, hora inicio y hora termino

### Asistencia
- `PARCIAL` Guardar asistencia diaria
- `PARCIAL` Guardar observacion de estudiante
- `OK` Manejo de errores por snackbar
- `PARCIAL` No usa formulario tradicional, depende de validacion por estado y contexto seleccionado

### Notas
- `PARCIAL` Guardar libro de calificaciones
- `OK` Manejo de errores por snackbar
- `PARCIAL` Requiere auditoria adicional si quieres validacion visual mas detallada por celda

### Administracion de usuarios
- `PARCIAL` Crear usuario
- `PARCIAL` Editar usuario
- `OK` Desactivar usuario
- `OK` Validaciones visibles en nombre, apellido paterno, email, run, telefono, estado y rol

### Administracion - Matriz de accesos
- `OK` Guardar cambios de matriz por rol
- `OK` Guardar excepciones por usuario
- `OK` Auditoria de cambio en backend
- `PARCIAL` Requiere reiniciar backend si hay una instancia antigua corriendo para tomar el endpoint nuevo

## Bloqueadores detectados
- Sin bloqueadores funcionales nuevos confirmados en esta pasada.

## Recomendaciones siguientes

1. Completar validacion visual explicita en `Nueva planificacion` para OA, evaluacion y chips dependientes.
2. Revisar con la misma profundidad `SubjectDialog`, `ActivityDialog` y `ScheduleDialog` contra pruebas reales end-to-end si quieres dejar auditoria completa de backend.
3. Hacer una pasada adicional de pruebas reales end-to-end en `Asistencia`, `Notas` y `Contenido`, porque hoy siguen mas cerca de `PARCIAL` que de `OK`.
