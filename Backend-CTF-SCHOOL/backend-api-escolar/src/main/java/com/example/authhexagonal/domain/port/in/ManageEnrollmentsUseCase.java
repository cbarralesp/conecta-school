package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.EnrollmentDetail;
import com.example.authhexagonal.domain.model.EnrollmentOverview;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentRequest;

public interface ManageEnrollmentsUseCase {

    EnrollmentOverview findOverview(String search, Long courseId, String status, Integer page, Integer size);

    EnrollmentDetail findById(Long enrollmentId);

    EnrollmentDetail create(EnrollmentRequest request);

    EnrollmentDetail update(Long enrollmentId, EnrollmentRequest request);

    void delete(Long enrollmentId);
}
