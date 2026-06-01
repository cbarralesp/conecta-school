package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.ManageEnrollmentsUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentDetailResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentAccessPreviewRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentAccessPreviewResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentOverviewResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/matriculas")
public class EnrollmentController {

    private final ManageEnrollmentsUseCase manageEnrollmentsUseCase;

    public EnrollmentController(ManageEnrollmentsUseCase manageEnrollmentsUseCase) {
        this.manageEnrollmentsUseCase = manageEnrollmentsUseCase;
    }

    @GetMapping
    public EnrollmentOverviewResponse findOverview(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "courseId", required = false) Long courseId,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size
    ) {
        return EnrollmentOverviewResponse.fromDomain(
                manageEnrollmentsUseCase.findOverview(search, courseId, status, page, size)
        );
    }

    @GetMapping("/{enrollmentId}")
    public EnrollmentDetailResponse findById(@PathVariable("enrollmentId") Long enrollmentId) {
        return EnrollmentDetailResponse.fromDomain(manageEnrollmentsUseCase.findById(enrollmentId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EnrollmentDetailResponse create(@Valid @RequestBody EnrollmentRequest request) {
        return EnrollmentDetailResponse.fromDomain(manageEnrollmentsUseCase.create(request));
    }

    @PutMapping("/{enrollmentId}")
    public EnrollmentDetailResponse update(
            @PathVariable("enrollmentId") Long enrollmentId,
            @Valid @RequestBody EnrollmentRequest request
    ) {
        return EnrollmentDetailResponse.fromDomain(manageEnrollmentsUseCase.update(enrollmentId, request));
    }

    @PostMapping("/access-preview")
    public EnrollmentAccessPreviewResponse previewAccess(@RequestBody EnrollmentAccessPreviewRequest request) {
        return manageEnrollmentsUseCase.previewAccess(request);
    }

    @DeleteMapping("/{enrollmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("enrollmentId") Long enrollmentId) {
        manageEnrollmentsUseCase.delete(enrollmentId);
    }

    @PostMapping("/{enrollmentId}/reactivar")
    public EnrollmentDetailResponse reactivate(@PathVariable("enrollmentId") Long enrollmentId) {
        return EnrollmentDetailResponse.fromDomain(manageEnrollmentsUseCase.reactivate(enrollmentId));
    }
}
