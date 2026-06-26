package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.EnrollmentDetail;
import com.example.authhexagonal.domain.model.EnrollmentDocument;
import com.example.authhexagonal.domain.model.EnrollmentEstablishment;
import com.example.authhexagonal.domain.model.EnrollmentFamilyContact;
import com.example.authhexagonal.domain.model.EnrollmentGuardianAccess;
import com.example.authhexagonal.domain.model.EnrollmentGuardian;
import com.example.authhexagonal.domain.model.EnrollmentOverview;
import com.example.authhexagonal.domain.model.EnrollmentPagination;
import com.example.authhexagonal.domain.model.EnrollmentPickupContact;
import com.example.authhexagonal.domain.model.EnrollmentSummary;
import com.example.authhexagonal.domain.model.EnrollmentStudentAccess;
import com.example.authhexagonal.domain.port.in.ManageEnrollmentsUseCase;
import com.example.authhexagonal.domain.port.out.ManageEnrollmentsPort;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentFamilyContactRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentAccessPreviewRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentAccessPreviewResponse;
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
        Long resolvedCourseId = resolveCourseId(request);

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
                            blankToEmpty(request.livesWith()),
                            blankToEmpty(request.allergies()),
                            blankToEmpty(request.specialistDiagnoses()),
                            blankToEmpty(request.emergencyContact()),
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
                        blankToEmpty(request.livesWith()),
                        blankToEmpty(request.allergies()),
                        blankToEmpty(request.specialistDiagnoses()),
                        blankToEmpty(request.emergencyContact()),
                        normalizeText(request.specialNeeds())
                ));

        Long enrollmentId = manageEnrollmentsPort.createEnrollment(
                studentId,
                resolvedCourseId,
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
        Long resolvedCourseId = resolveCourseId(request);

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
                blankToEmpty(request.livesWith()),
                blankToEmpty(request.allergies()),
                blankToEmpty(request.specialistDiagnoses()),
                blankToEmpty(request.emergencyContact()),
                normalizeText(request.specialNeeds())
        );
        manageEnrollmentsPort.updateEnrollment(
                enrollmentId,
                studentId,
                resolvedCourseId,
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
    public EnrollmentAccessPreviewResponse previewAccess(EnrollmentAccessPreviewRequest request) {
        return new EnrollmentAccessPreviewResponse(
                manageEnrollmentsPort.previewStudentUsername(
                        request.studentRun(),
                        request.studentName(),
                        request.studentLastName()
                ),
                manageEnrollmentsPort.previewGuardianUsername(
                        request.guardianRun(),
                        request.guardianName(),
                        request.guardianLastName()
                )
        );
    }

    @Override
    @Transactional
    public void delete(Long enrollmentId) {
        findById(enrollmentId);
        if (manageEnrollmentsPort.isEnrollmentInactive(enrollmentId)) {
            manageEnrollmentsPort.hardDeleteEnrollment(enrollmentId);
            return;
        }
        manageEnrollmentsPort.deactivateEnrollment(enrollmentId);
    }

    @Override
    @Transactional
    public EnrollmentDetail reactivate(Long enrollmentId) {
        findById(enrollmentId);
        manageEnrollmentsPort.reactivateEnrollment(enrollmentId);
        return findById(enrollmentId);
    }

    private void validateCourse(Long courseId) {
        if (!manageEnrollmentsPort.existsActiveCourse(courseId)) {
            throw new IllegalArgumentException("Selected course is not available");
        }
    }

    private Long resolveCourseId(EnrollmentRequest request) {
        if (request.courseId() != null && request.courseId() > 0 && manageEnrollmentsPort.existsActiveCourse(request.courseId())) {
            return request.courseId();
        }

        if (request.courseSelection() == null) {
            throw new IllegalArgumentException("Selected course is not available");
        }

        String baseName = request.courseSelection().baseName() == null ? "" : request.courseSelection().baseName().trim();
        String level = request.courseSelection().level() == null ? "" : request.courseSelection().level().trim();
        String letter = request.courseSelection().letter() == null ? "" : request.courseSelection().letter().trim();
        String schoolYearValue = request.courseSelection().schoolYear() == null ? "" : request.courseSelection().schoolYear().trim();
        String scheduleType = request.courseSelection().scheduleType() == null ? "" : request.courseSelection().scheduleType().trim();

        if (baseName.isBlank() || level.isBlank() || letter.isBlank() || schoolYearValue.isBlank() || scheduleType.isBlank()) {
            throw new IllegalArgumentException("Selected course is not available");
        }

        int schoolYear;
        try {
            schoolYear = Integer.parseInt(schoolYearValue);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Selected course is not available");
        }

        if (schoolYear < 2000 || schoolYear > 2100) {
            throw new IllegalArgumentException("Selected course is not available");
        }

        return manageEnrollmentsPort.findOrCreateCourse(baseName, level, letter, schoolYear, scheduleType);
    }

    private void saveContacts(Long enrollmentId, EnrollmentRequest request) {
        manageEnrollmentsPort.replaceGuardian(enrollmentId, new EnrollmentGuardian(
                null,
                request.guardian().run(),
                request.guardian().name(),
                request.guardian().lastName(),
                request.guardian().birthDate(),
                request.guardian().address(),
                request.guardian().phone(),
                request.guardian().email(),
                request.guardian().education(),
                request.guardian().relation(),
                request.guardian().authorizedPickup()
        ));
        manageEnrollmentsPort.replaceFather(enrollmentId, mapFamilyContact(request.father()));
        manageEnrollmentsPort.replaceMother(enrollmentId, mapFamilyContact(request.mother()));
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
                resolveStudentUsername(request, studentAccess),
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

    private EnrollmentFamilyContact mapFamilyContact(EnrollmentFamilyContactRequest request) {
        if (request == null) {
            return new EnrollmentFamilyContact(null, "", "", "", "", "", "", "", "");
        }
        return new EnrollmentFamilyContact(
                null,
                blankToEmpty(request.run()),
                blankToEmpty(request.name()),
                blankToEmpty(request.lastName()),
                blankToEmpty(request.birthDate()),
                blankToEmpty(request.address()),
                blankToEmpty(request.phone()),
                blankToEmpty(request.email()),
                blankToEmpty(request.education())
        );
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

    private String blankToEmpty(String value) {
        return value == null ? "" : value.trim();
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
        if (normalizedRun.length() <= 1) {
            return normalizedRun;
        }
        return normalizedRun.substring(0, normalizedRun.length() - 1);
    }

    private String resolveStudentUsername(EnrollmentRequest request, EnrollmentStudentAccess studentAccess) {
        if (studentAccess.username() != null && !studentAccess.username().isBlank()) {
            return studentAccess.username().trim();
        }

        String normalizedRun = request.studentRun().replaceAll("[^0-9kK]", "").toUpperCase();
        if (normalizedRun.length() <= 1) {
            return normalizedRun;
        }
        return normalizedRun.substring(0, normalizedRun.length() - 1) + "-" + normalizedRun.substring(normalizedRun.length() - 1);
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
