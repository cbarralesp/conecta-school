package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.EnrollmentDetail;
import com.example.authhexagonal.domain.model.EnrollmentDocument;
import com.example.authhexagonal.domain.model.EnrollmentEstablishment;
import com.example.authhexagonal.domain.model.EnrollmentGuardianAccess;
import com.example.authhexagonal.domain.model.EnrollmentGuardian;
import com.example.authhexagonal.domain.model.EnrollmentOverview;
import com.example.authhexagonal.domain.model.EnrollmentPagination;
import com.example.authhexagonal.domain.model.EnrollmentPickupContact;
import com.example.authhexagonal.domain.model.EnrollmentSummary;
import com.example.authhexagonal.domain.model.EnrollmentStudentAccess;
import com.example.authhexagonal.domain.port.in.ManageEnrollmentsUseCase;
import com.example.authhexagonal.domain.port.out.ManageEnrollmentsPort;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentPickupContactRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EnrollmentService implements ManageEnrollmentsUseCase {

    private final ManageEnrollmentsPort manageEnrollmentsPort;
    private final PasswordEncoder passwordEncoder;

    public EnrollmentService(ManageEnrollmentsPort manageEnrollmentsPort, PasswordEncoder passwordEncoder) {
        this.manageEnrollmentsPort = manageEnrollmentsPort;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public EnrollmentOverview findOverview(String search, Long courseId, String status, Integer page, Integer size) {
        int normalizedPage = page == null ? 0 : Math.max(page, 0);
        EnrollmentSummary summary = manageEnrollmentsPort.summarizeEnrollments(search, courseId, status);
        int normalizedSize = size == null ? Math.max(summary.total(), 1) : Math.max(size, 1);
        int totalPages = summary.total() == 0 ? 0 : (int) Math.ceil((double) summary.total() / normalizedSize);

        return new EnrollmentOverview(
                summary,
                manageEnrollmentsPort.findActiveCourses(),
                manageEnrollmentsPort.findEnrollments(search, courseId, status, normalizedPage, normalizedSize),
                new EnrollmentPagination(
                        normalizedPage,
                        normalizedSize,
                        summary.total(),
                        totalPages
                )
        );
    }

    @Override
    public EnrollmentDetail findById(Long enrollmentId) {
        return manageEnrollmentsPort.findEnrollmentDetailById(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found"));
    }

    @Override
    @Transactional
    public EnrollmentDetail create(EnrollmentRequest request) {
        validateCourse(request.courseId());

        Long studentId = manageEnrollmentsPort.findStudentIdByRun(request.studentRun())
                .map(existingId -> {
                    if (manageEnrollmentsPort.hasActiveEnrollmentForStudent(existingId, null)) {
                        throw new IllegalArgumentException("Student already has an active enrollment");
                    }
                    manageEnrollmentsPort.updateStudent(
                            existingId,
                            request.studentRun(),
                            request.studentName(),
                            request.studentLastName(),
                            request.birthDate(),
                            request.gender(),
                            request.regionId(),
                            request.communeId(),
                            request.address(),
                            normalizeText(request.specialNeeds())
                    );
                    return existingId;
                })
                .orElseGet(() -> manageEnrollmentsPort.createStudent(
                        request.studentRun(),
                        request.studentName(),
                        request.studentLastName(),
                        request.birthDate(),
                        request.gender(),
                        request.regionId(),
                        request.communeId(),
                        request.address(),
                        normalizeText(request.specialNeeds())
                ));

        Long enrollmentId = manageEnrollmentsPort.createEnrollment(
                studentId,
                request.courseId(),
                request.status(),
                request.enrollmentDate(),
                mapEstablishment(request)
        );
        saveContacts(enrollmentId, request);
        provisionStudentAccessIfNeeded(request);
        provisionGuardianAccessIfNeeded(request);
        return findById(enrollmentId);
    }

    @Override
    @Transactional
    public EnrollmentDetail update(Long enrollmentId, EnrollmentRequest request) {
        EnrollmentDetail current = findById(enrollmentId);
        validateCourse(request.courseId());

        Long studentId = manageEnrollmentsPort.findStudentIdByRun(request.studentRun())
                .map(existingId -> {
                    if (!existingId.equals(current.studentId())
                            && manageEnrollmentsPort.hasActiveEnrollmentForStudent(existingId, enrollmentId)) {
                        throw new IllegalArgumentException("Student already has an active enrollment");
                    }
                    return existingId;
                })
                .orElse(current.studentId());

        manageEnrollmentsPort.updateStudent(
                studentId,
                request.studentRun(),
                request.studentName(),
                request.studentLastName(),
                request.birthDate(),
                request.gender(),
                request.regionId(),
                request.communeId(),
                request.address(),
                normalizeText(request.specialNeeds())
        );
        manageEnrollmentsPort.updateEnrollment(
                enrollmentId,
                studentId,
                request.courseId(),
                request.status(),
                request.enrollmentDate(),
                mapEstablishment(request)
        );
        saveContacts(enrollmentId, request);
        provisionStudentAccessIfNeeded(request);
        provisionGuardianAccessIfNeeded(request);
        return findById(enrollmentId);
    }

    @Override
    @Transactional
    public void delete(Long enrollmentId) {
        findById(enrollmentId);
        manageEnrollmentsPort.deactivateEnrollment(enrollmentId);
    }

    private void validateCourse(Long courseId) {
        if (!manageEnrollmentsPort.existsActiveCourse(courseId)) {
            throw new IllegalArgumentException("Selected course is not available");
        }
    }

    private void saveContacts(Long enrollmentId, EnrollmentRequest request) {
        manageEnrollmentsPort.replaceGuardian(enrollmentId, new EnrollmentGuardian(
                null,
                request.guardian().run(),
                request.guardian().name(),
                request.guardian().lastName(),
                request.guardian().phone(),
                request.guardian().email(),
                request.guardian().relation(),
                request.guardian().authorizedPickup()
        ));
        manageEnrollmentsPort.replacePickupContacts(enrollmentId, mapPickupContacts(request.pickupContacts()));
        manageEnrollmentsPort.replaceDocuments(enrollmentId, mapDocuments(request));
    }

    private void provisionStudentAccessIfNeeded(EnrollmentRequest request) {
        EnrollmentStudentAccess studentAccess = resolveStudentAccess(request);
        if (!studentAccess.configureAccess() || !studentAccess.createStudentAccount()) {
            return;
        }

        manageEnrollmentsPort.provisionStudentAccess(
                request.studentRun(),
                request.studentName(),
                request.studentLastName(),
                request.guardian().email(),
                request.guardian().phone(),
                passwordEncoder.encode(resolveTemporaryPassword(request, studentAccess)),
                studentAccess.notifyByEmail()
        );
    }

    private void provisionGuardianAccessIfNeeded(EnrollmentRequest request) {
        EnrollmentGuardianAccess guardianAccess = resolveGuardianAccess(request);
        if (!guardianAccess.configureAccess() || !guardianAccess.createGuardianAccount()) {
            return;
        }

        manageEnrollmentsPort.provisionGuardianAccess(
                request.guardian().run(),
                request.guardian().name(),
                request.guardian().lastName(),
                request.guardian().email(),
                request.guardian().phone(),
                passwordEncoder.encode(resolveGuardianTemporaryPassword(request, guardianAccess)),
                guardianAccess.notifyByEmail()
        );
    }

    private List<EnrollmentPickupContact> mapPickupContacts(List<EnrollmentPickupContactRequest> contacts) {
        return contacts.stream()
                .map(contact -> new EnrollmentPickupContact(
                        null,
                        contact.run(),
                        contact.name(),
                        contact.lastName(),
                        contact.phone(),
                        contact.relation(),
                        contact.authorizedPickup()
                ))
                .toList();
    }

    private List<EnrollmentDocument> mapDocuments(EnrollmentRequest request) {
        if (request.documents() == null || request.documents().isEmpty()) {
            return List.of();
        }

        return request.documents().stream()
                .map(document -> new EnrollmentDocument(
                        null,
                        document.documentKey(),
                        document.fileName(),
                        null,
                        null
                ))
                .toList();
    }

    private EnrollmentEstablishment mapEstablishment(EnrollmentRequest request) {
        return new EnrollmentEstablishment(
                request.establishment().regionId(),
                request.establishment().communeId(),
                request.establishment().name(),
                request.establishment().academicYear(),
                request.establishment().dependency(),
                request.establishment().region(),
                request.establishment().commune(),
                request.establishment().address()
        );
    }

    private String normalizeText(String value) {
        return value == null || value.isBlank() ? "No" : value;
    }

    private EnrollmentStudentAccess resolveStudentAccess(EnrollmentRequest request) {
        if (request.studentAccess() == null) {
            return new EnrollmentStudentAccess(false, false, "", "", false, "", "Sin cuenta");
        }

        return request.studentAccess().toDomain();
    }

    private EnrollmentGuardianAccess resolveGuardianAccess(EnrollmentRequest request) {
        if (request.guardianAccess() == null) {
            return new EnrollmentGuardianAccess(false, false, "", "", false, "", "Sin cuenta");
        }

        return request.guardianAccess().toDomain();
    }

    private String resolveTemporaryPassword(EnrollmentRequest request, EnrollmentStudentAccess studentAccess) {
        if (studentAccess.temporaryPassword() != null && !studentAccess.temporaryPassword().isBlank()) {
            return studentAccess.temporaryPassword().trim();
        }

        String normalizedRun = request.studentRun().replaceAll("[^0-9kK]", "").toUpperCase();
        String suffix = normalizedRun.length() >= 4 ? normalizedRun.substring(normalizedRun.length() - 4) : "2024";
        String firstInitial = request.studentName().isBlank() ? "A" : request.studentName().trim().substring(0, 1).toUpperCase();
        return "Tfs" + firstInitial + suffix + "!";
    }

    private String resolveGuardianTemporaryPassword(EnrollmentRequest request, EnrollmentGuardianAccess guardianAccess) {
        if (guardianAccess.temporaryPassword() != null && !guardianAccess.temporaryPassword().isBlank()) {
            return guardianAccess.temporaryPassword().trim();
        }

        String normalizedRun = request.guardian().run().replaceAll("[^0-9kK]", "").toUpperCase();
        String suffix = normalizedRun.length() >= 4 ? normalizedRun.substring(normalizedRun.length() - 4) : "2024";
        String firstInitial = request.guardian().name().isBlank() ? "A" : request.guardian().name().trim().substring(0, 1).toUpperCase();
        return "Apo" + firstInitial + suffix + "!";
    }
}
