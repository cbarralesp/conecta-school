package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.StoredFileReference;
import com.example.authhexagonal.domain.port.out.FileStoragePort;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

@Component
public class LocalPlanningFileStorageAdapter implements FileStoragePort {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final Path BASE_DIRECTORY = Paths.get("uploads", "planning-classes");

    @Override
    public StoredFileReference storePlanningClassDocument(String originalName, String mimeType, byte[] content) {
        try {
            Files.createDirectories(BASE_DIRECTORY);
            String extension = extractExtension(originalName);
            String baseName = slugify(removeExtension(originalName));
            String timestamp = LocalDateTime.now().format(FORMATTER);
            String storedName = baseName + "-" + timestamp + "-" + UUID.randomUUID().toString().substring(0, 8)
                    + "." + extension;
            Path targetPath = BASE_DIRECTORY.resolve(storedName);
            Files.write(targetPath, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

            return new StoredFileReference(
                    originalName,
                    storedName,
                    extension,
                    mimeType == null || mimeType.isBlank() ? "application/octet-stream" : mimeType,
                    content.length,
                    targetPath.toString()
            );
        } catch (IOException exception) {
            throw new IllegalStateException("No fue posible almacenar el documento adjunto", exception);
        }
    }

    @Override
    public byte[] read(String filePath) {
        if (filePath == null || filePath.isBlank()) {
            throw new IllegalArgumentException("La ruta del archivo no es valida");
        }

        try {
            return Files.readAllBytes(Paths.get(filePath));
        } catch (IOException exception) {
            throw new IllegalStateException("No fue posible leer el documento adjunto", exception);
        }
    }

    @Override
    public void delete(String filePath) {
        if (filePath == null || filePath.isBlank()) {
            return;
        }

        try {
            Files.deleteIfExists(Paths.get(filePath));
        } catch (IOException exception) {
            throw new IllegalStateException("No fue posible eliminar el documento adjunto", exception);
        }
    }

    private String removeExtension(String value) {
        int dotIndex = value.lastIndexOf('.');
        return dotIndex > 0 ? value.substring(0, dotIndex) : value;
    }

    private String extractExtension(String value) {
        int dotIndex = value.lastIndexOf('.');
        return dotIndex > 0 ? value.substring(dotIndex + 1).toLowerCase(Locale.ROOT) : "bin";
    }

    private String slugify(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-zA-Z0-9]+", "-")
                .replaceAll("(^-|-$)", "")
                .toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? "documento" : normalized;
    }
}
