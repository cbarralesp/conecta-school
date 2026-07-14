package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.EnrollmentDetail;
import com.example.authhexagonal.domain.model.EnrollmentDocument;
import com.example.authhexagonal.domain.model.EnrollmentDocumentDownload;
import com.example.authhexagonal.domain.model.EnrollmentEstablishment;
import com.example.authhexagonal.domain.model.EnrollmentFamilyContact;
import com.example.authhexagonal.domain.model.EnrollmentGuardianAccess;
import com.example.authhexagonal.domain.model.EnrollmentGuardian;
import com.example.authhexagonal.domain.model.EnrollmentOverview;
import com.example.authhexagonal.domain.model.EnrollmentPagination;
import com.example.authhexagonal.domain.model.EnrollmentPickupContact;
import com.example.authhexagonal.domain.model.EnrollmentSummary;
import com.example.authhexagonal.domain.model.EnrollmentStudentAccess;
import com.example.authhexagonal.domain.model.StoredFileReference;
import com.example.authhexagonal.domain.model.StudentPhotoDownload;
import com.example.authhexagonal.domain.port.in.ManageEnrollmentsUseCase;
import com.example.authhexagonal.domain.port.out.FileStoragePort;
import com.example.authhexagonal.domain.port.out.ManageEnrollmentsPort;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentFamilyContactRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentAccessPreviewRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentAccessPreviewResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentCourseSelectionRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentPickupContactRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentRenewalRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class EnrollmentService implements ManageEnrollmentsUseCase {

    private static final long MAX_ENROLLMENT_DOCUMENT_SIZE_BYTES = 20L * 1024L * 1024L;
    private static final long MAX_STUDENT_PHOTO_SIZE_BYTES = 5L * 1024L * 1024L;
    private static final Set<String> ALLOWED_ENROLLMENT_DOCUMENT_EXTENSIONS = Set.of(
            "pdf", "png", "jpg", "jpeg", "webp", "doc", "docx"
    );
    private static final Set<String> ALLOWED_STUDENT_PHOTO_EXTENSIONS = Set.of("png", "jpg", "jpeg", "webp");
    private static final Map<String, String> ENROLLMENT_DOCUMENT_KEY_ALIASES = Map.of(
            "image-permission", "image-consent",
            "junaeb-sep", "other",
            "migratory-docs", "other",
            "priority-certificate", "other"
    );

    private final ManageEnrollmentsPort manageEnrollmentsPort;
    private final PasswordEncoder passwordEncoder;
    private final FileStoragePort fileStoragePort;

    public EnrollmentService(
            ManageEnrollmentsPort manageEnrollmentsPort,
            PasswordEncoder passwordEncoder,
            FileStoragePort fileStoragePort
    ) {
        this.manageEnrollmentsPort = manageEnrollmentsPort;
        this.passwordEncoder = passwordEncoder;
        this.fileStoragePort = fileStoragePort;
    }

    @Override
    public EnrollmentOverview findOverview(Integer schoolYear, String search, Long courseId, String status, Integer page, Integer size) {
        int normalizedPage = page == null ? 0 : Math.max(page, 0);
        EnrollmentSummary summary = manageEnrollmentsPort.summarizeEnrollments(schoolYear, search, courseId, status);
        int normalizedSize = size == null ? Math.max(summary.total(), 1) : Math.max(size, 1);
        int totalPages = summary.total() == 0 ? 0 : (int) Math.ceil((double) summary.total() / normalizedSize);

        return new EnrollmentOverview(
                summary,
                manageEnrollmentsPort.findActiveCourses(schoolYear),
                manageEnrollmentsPort.findEnrollments(schoolYear, search, courseId, status, normalizedPage, normalizedSize),
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
    @Transactional
    public EnrollmentDetail renew(Long enrollmentId, EnrollmentRenewalRequest request) {
        EnrollmentDetail current = findById(enrollmentId);
        Long resolvedCourseId = resolveCourseId(request.courseId(), request.courseSelection());
        int targetSchoolYear = manageEnrollmentsPort.findCourseSchoolYear(resolvedCourseId)
                .orElseThrow(() -> new IllegalArgumentException("Selected course is not available"));

        if (manageEnrollmentsPort.hasActiveEnrollmentForStudentInSchoolYear(current.studentId(), targetSchoolYear)) {
            throw new IllegalArgumentException("Student already has an active enrollment for the selected school year");
        }

        EnrollmentEstablishment establishment = new EnrollmentEstablishment(
                current.establishment().regionId(),
                current.establishment().communeId(),
                current.establishment().name(),
                String.valueOf(targetSchoolYear),
                current.establishment().dependency(),
                current.establishment().region(),
                current.establishment().commune(),
                current.establishment().address()
        );

        Long renewedEnrollmentId = manageEnrollmentsPort.createEnrollment(
                current.studentId(),
                resolvedCourseId,
                "ACTIVO",
                request.enrollmentDate() == null ? LocalDate.now() : request.enrollmentDate(),
                establishment
        );
        manageEnrollmentsPort.replaceGuardian(renewedEnrollmentId, current.guardian());
        manageEnrollmentsPort.replaceFather(renewedEnrollmentId, current.father());
        manageEnrollmentsPort.replaceMother(renewedEnrollmentId, current.mother());
        manageEnrollmentsPort.replacePickupContacts(renewedEnrollmentId, current.pickupContacts());
        manageEnrollmentsPort.replaceDocuments(renewedEnrollmentId, current.documents());
        return findById(renewedEnrollmentId);
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
    public EnrollmentDocument uploadDocument(
            Long enrollmentId,
            String documentKey,
            String originalName,
            String mimeType,
            byte[] content
    ) {
        EnrollmentDetail current = findById(enrollmentId);
        validateDocumentUpload(documentKey, originalName, content);
        String normalizedDocumentKey = normalizeDocumentKey(documentKey);

        current.documents().stream()
                .filter(document -> document.documentKey().equals(normalizedDocumentKey))
                .map(EnrollmentDocument::filePath)
                .filter(path -> path != null && !path.isBlank())
                .findFirst()
                .ifPresent(fileStoragePort::delete);

        StoredFileReference storedFile = fileStoragePort.storeEnrollmentDocument(
                buildCourseFolder(current),
                buildStudentFolder(current),
                normalizedDocumentKey,
                originalName,
                mimeType,
                content
        );

        String normalizedMimeType = storedFile.mimeType() == null || storedFile.mimeType().isBlank()
                ? "application/octet-stream"
                : storedFile.mimeType();

        return manageEnrollmentsPort.upsertDocument(enrollmentId, new EnrollmentDocument(
                null,
                normalizedDocumentKey,
                storedFile.originalName(),
                "local",
                buildStorageKey(current, normalizedDocumentKey, storedFile.storedName()),
                null,
                null,
                normalizedMimeType,
                storedFile.sizeBytes(),
                storedFile.filePath()
        ));
    }

    @Override
    public EnrollmentDocumentDownload downloadDocument(Long enrollmentId, Long documentId) {
        EnrollmentDocument document = findById(enrollmentId).documents().stream()
                .filter(item -> item.id() != null && item.id().equals(documentId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Documento de matricula no encontrado"));

        if (document.filePath() == null || document.filePath().isBlank()) {
            throw new ResourceNotFoundException("El documento no tiene archivo asociado");
        }

        return new EnrollmentDocumentDownload(document, fileStoragePort.read(document.filePath()));
    }

    @Override
    @Transactional
    public EnrollmentDetail uploadStudentPhoto(
            Long enrollmentId,
            String originalName,
            String mimeType,
            byte[] content
    ) {
        EnrollmentDetail current = findById(enrollmentId);
        validateStudentPhotoUpload(originalName, content);

        if (current.studentPhotoPath() != null && !current.studentPhotoPath().isBlank()) {
            fileStoragePort.delete(current.studentPhotoPath());
        }

        StoredFileReference storedFile = fileStoragePort.storeStudentProfilePhoto(
                buildCourseFolder(current),
                buildStudentFolder(current),
                originalName,
                mimeType,
                content
        );
        String normalizedMimeType = storedFile.mimeType() == null || storedFile.mimeType().isBlank()
                ? "application/octet-stream"
                : storedFile.mimeType();

        manageEnrollmentsPort.updateStudentPhoto(current.studentId(), storedFile.filePath(), normalizedMimeType);
        return findById(enrollmentId);
    }

    @Override
    public StudentPhotoDownload downloadStudentPhoto(Long enrollmentId) {
        EnrollmentDetail current = findById(enrollmentId);
        if (current.studentPhotoPath() == null || current.studentPhotoPath().isBlank()) {
            throw new ResourceNotFoundException("El alumno no tiene foto de perfil");
        }

        String extension = mimeTypeToExtension(current.studentPhotoMimeType());
        return new StudentPhotoDownload(
                "foto-alumno-" + current.studentId() + "." + extension,
                current.studentPhotoMimeType(),
                fileStoragePort.read(current.studentPhotoPath())
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
        return resolveCourseId(request.courseId(), request.courseSelection());
    }

    private Long resolveCourseId(Long courseId, EnrollmentCourseSelectionRequest courseSelection) {
        if (courseId != null && courseId > 0 && manageEnrollmentsPort.existsActiveCourse(courseId)) {
            return courseId;
        }

        if (courseSelection == null) {
            throw new IllegalArgumentException("Selected course is not available");
        }

        String baseName = courseSelection.baseName() == null ? "" : courseSelection.baseName().trim();
        String level = courseSelection.level() == null ? "" : courseSelection.level().trim();
        String letter = courseSelection.letter() == null ? "" : courseSelection.letter().trim();
        String schoolYearValue = courseSelection.schoolYear() == null ? "" : courseSelection.schoolYear().trim();
        String scheduleType = courseSelection.scheduleType() == null ? "" : courseSelection.scheduleType().trim();

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
                        normalizeDocumentKey(document.documentKey()),
                        document.fileName(),
                        null,
                        null,
                        null,
                        null,
                        null,
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

    private void validateDocumentUpload(String documentKey, String originalName, byte[] content) {
        if (documentKey == null || documentKey.isBlank()) {
            throw new IllegalArgumentException("La clave del documento no es valida");
        }
        if (originalName == null || originalName.isBlank()) {
            throw new IllegalArgumentException("El archivo no tiene nombre valido");
        }
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException("El archivo adjunto esta vacio");
        }
        if (content.length > MAX_ENROLLMENT_DOCUMENT_SIZE_BYTES) {
            throw new IllegalArgumentException("El archivo supera el limite de 20 MB");
        }

        String extension = extractExtension(originalName);
        if (!ALLOWED_ENROLLMENT_DOCUMENT_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Solo se permiten archivos PDF, DOC, DOCX, JPG, JPEG, PNG o WEBP");
        }
    }

    private void validateStudentPhotoUpload(String originalName, byte[] content) {
        if (originalName == null || originalName.isBlank()) {
            throw new IllegalArgumentException("La foto no tiene nombre valido");
        }
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException("La foto adjunta esta vacia");
        }
        if (content.length > MAX_STUDENT_PHOTO_SIZE_BYTES) {
            throw new IllegalArgumentException("La foto supera el limite de 5 MB");
        }

        String extension = extractExtension(originalName);
        if (!ALLOWED_STUDENT_PHOTO_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Solo se permiten fotos JPG, JPEG, PNG o WEBP");
        }
    }

    private String normalizeDocumentKey(String documentKey) {
        String normalizedKey = documentKey == null ? "" : documentKey.trim();
        return ENROLLMENT_DOCUMENT_KEY_ALIASES.getOrDefault(normalizedKey, normalizedKey);
    }

    private String extractExtension(String originalName) {
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == originalName.length() - 1) {
            return "";
        }
        return originalName.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }

    private String mimeTypeToExtension(String mimeType) {
        String normalizedMimeType = mimeType == null ? "" : mimeType.trim().toLowerCase(Locale.ROOT);
        return switch (normalizedMimeType) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "jpg";
        };
    }

    private String buildStorageKey(EnrollmentDetail enrollment, String documentKey, String storedName) {
        return "matriculas/"
                + slugifyStoragePart(buildCourseFolder(enrollment))
                + "/"
                + slugifyStoragePart(buildStudentFolder(enrollment))
                + "/"
                + slugifyStoragePart(documentKey)
                + "/"
                + storedName;
    }

    private String buildCourseFolder(EnrollmentDetail enrollment) {
        String courseName = enrollment.courseName() == null ? "" : enrollment.courseName().trim();
        if (!courseName.isBlank()) {
            return courseName;
        }

        String level = enrollment.courseLevel() == null ? "" : enrollment.courseLevel().trim();
        String letter = enrollment.courseLetter() == null ? "" : enrollment.courseLetter().trim();
        return (level + " " + letter).trim();
    }

    private String buildStudentFolder(EnrollmentDetail enrollment) {
        return (blankToEmpty(enrollment.studentName()) + " " + blankToEmpty(enrollment.studentLastName())).trim();
    }

    private String slugifyStoragePart(String value) {
        if (value == null || value.isBlank()) {
            return "sin-dato";
        }
        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-zA-Z0-9]+", "-")
                .replaceAll("(^-|-$)", "")
                .toLowerCase(Locale.ROOT);
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
