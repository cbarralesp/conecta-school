package com.example.authhexagonal.domain.model;

/**
 * Filtros opcionales para listar documentos del banco de planificacion.
 */
public record PlanningDocumentFilter(
        PlanningDocumentFileType fileType,
        Long unitId,
        Long classId,
        Long subjectId,
        Boolean visibleToStudents
) {
}
