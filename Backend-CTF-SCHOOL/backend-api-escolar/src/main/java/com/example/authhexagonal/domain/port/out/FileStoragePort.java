package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.StoredFileReference;

public interface FileStoragePort {

    StoredFileReference storePlanningClassDocument(
            String rootFolder,
            String schoolYearFolder,
            String semesterFolder,
            String courseFolder,
            String subjectFolder,
            String unitFolder,
            String classFolder,
            String originalName,
            String mimeType,
            byte[] content
    );

    StoredFileReference storeEnrollmentDocument(
            String courseFolder,
            String studentFolder,
            String documentKey,
            String originalName,
            String mimeType,
            byte[] content
    );

    StoredFileReference storeStudentProfilePhoto(
            String courseFolder,
            String studentFolder,
            String originalName,
            String mimeType,
            byte[] content
    );

    byte[] read(String filePath);

    void delete(String filePath);
}
