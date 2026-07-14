package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.EnrollmentDetail;
import com.example.authhexagonal.domain.model.EnrollmentDocumentDownload;
import com.example.authhexagonal.domain.model.EnrollmentDocument;
import com.example.authhexagonal.domain.model.EnrollmentOverview;
import com.example.authhexagonal.domain.model.StudentPhotoDownload;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentAccessPreviewRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentAccessPreviewResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentRenewalRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentRequest;

public interface ManageEnrollmentsUseCase {

    EnrollmentOverview findOverview(Integer schoolYear, String search, Long courseId, String status, Integer page, Integer size);

    EnrollmentDetail findById(Long enrollmentId);

    EnrollmentDetail create(EnrollmentRequest request);

    EnrollmentDetail update(Long enrollmentId, EnrollmentRequest request);

    EnrollmentDetail renew(Long enrollmentId, EnrollmentRenewalRequest request);

    EnrollmentAccessPreviewResponse previewAccess(EnrollmentAccessPreviewRequest request);

    EnrollmentDocument uploadDocument(Long enrollmentId, String documentKey, String originalName, String mimeType, byte[] content);

    EnrollmentDocumentDownload downloadDocument(Long enrollmentId, Long documentId);

    EnrollmentDetail uploadStudentPhoto(Long enrollmentId, String originalName, String mimeType, byte[] content);

    StudentPhotoDownload downloadStudentPhoto(Long enrollmentId);

    void delete(Long enrollmentId);

    EnrollmentDetail reactivate(Long enrollmentId);
}
