package com.example.authhexagonal.domain.model;

/**
 * Contenedor de descarga desacoplado del storage fisico.
 */
public record PlanningDocumentDownload(
        PlanningDocument document,
        byte[] content
) {
}
