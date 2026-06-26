package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.EnrollmentCourseOption;
import com.example.authhexagonal.domain.model.EnrollmentDetail;
import com.example.authhexagonal.domain.model.EnrollmentDocument;
import com.example.authhexagonal.domain.model.EnrollmentEstablishment;
import com.example.authhexagonal.domain.model.EnrollmentFamilyContact;
import com.example.authhexagonal.domain.model.EnrollmentGuardianAccess;
import com.example.authhexagonal.domain.model.EnrollmentGuardian;
import com.example.authhexagonal.domain.model.EnrollmentListItem;
import com.example.authhexagonal.domain.model.EnrollmentPickupContact;
import com.example.authhexagonal.domain.model.EnrollmentStudentAccess;
import com.example.authhexagonal.domain.model.EnrollmentSummary;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ManageEnrollmentsPort {

    EnrollmentSummary summarizeEnrollments(String search, Long courseId, String status);

    List<EnrollmentCourseOption> findActiveCourses();

    List<EnrollmentListItem> findEnrollments(String search, Long courseId, String status, Integer page, Integer size);

    Optional<EnrollmentDetail> findEnrollmentDetailById(Long enrollmentId);

    Optional<Long> findStudentIdByRun(String run);

    Optional<EnrollmentStudentAccess> findStudentAccessByRun(String run);

    Optional<EnrollmentGuardianAccess> findGuardianAccessByRun(String run);

    String previewStudentUsername(String studentRun, String studentName, String studentLastName);

    String previewGuardianUsername(String guardianRun, String guardianName, String guardianLastName);

    boolean hasActiveEnrollmentForStudent(Long studentId, Long excludeEnrollmentId);

    Long createStudent(
            String run,
            String name,
            String lastName,
            LocalDate birthDate,
            String gender,
            Long regionId,
            Long communeId,
            String address,
            String livesWith,
            String allergies,
            String specialistDiagnoses,
            String emergencyContact,
            String specialNeeds
    );

    void updateStudent(
            Long studentId,
            String run,
            String name,
            String lastName,
            LocalDate birthDate,
            String gender,
            Long regionId,
            Long communeId,
            String address,
            String livesWith,
            String allergies,
            String specialistDiagnoses,
            String emergencyContact,
            String specialNeeds
    );

    boolean existsActiveCourse(Long courseId);

    Long findOrCreateCourse(
            String baseName,
            String level,
            String letter,
            int schoolYear,
            String scheduleType
    );

    Long createEnrollment(
            Long studentId,
            Long courseId,
            String status,
            LocalDate enrollmentDate,
            EnrollmentEstablishment establishment
    );

    void updateEnrollment(
            Long enrollmentId,
            Long studentId,
            Long courseId,
            String status,
            LocalDate enrollmentDate,
            EnrollmentEstablishment establishment
    );

    boolean isEnrollmentInactive(Long enrollmentId);

    void deactivateEnrollment(Long enrollmentId);

    void reactivateEnrollment(Long enrollmentId);

    void hardDeleteEnrollment(Long enrollmentId);

    void replaceGuardian(Long enrollmentId, EnrollmentGuardian guardian);

    void replaceFather(Long enrollmentId, EnrollmentFamilyContact father);

    void replaceMother(Long enrollmentId, EnrollmentFamilyContact mother);

    void replacePickupContacts(Long enrollmentId, List<EnrollmentPickupContact> contacts);

    void replaceDocuments(Long enrollmentId, List<EnrollmentDocument> documents);

    EnrollmentStudentAccess provisionStudentAccess(
            String studentRun,
            String studentName,
            String studentLastName,
            String username,
            String guardianEmail,
            String guardianPhone,
            String encodedPassword,
            boolean notifyByEmail
    );

    EnrollmentGuardianAccess provisionGuardianAccess(
            String guardianRun,
            String guardianName,
            String guardianLastName,
            String guardianEmail,
            String guardianPhone,
            String encodedPassword,
            boolean notifyByEmail
    );
}
