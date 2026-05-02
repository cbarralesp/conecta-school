package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.EnrollmentCourseOption;
import com.example.authhexagonal.domain.model.EnrollmentDetail;
import com.example.authhexagonal.domain.model.EnrollmentDocument;
import com.example.authhexagonal.domain.model.EnrollmentEstablishment;
import com.example.authhexagonal.domain.model.EnrollmentGuardian;
import com.example.authhexagonal.domain.model.EnrollmentListItem;
import com.example.authhexagonal.domain.model.EnrollmentPickupContact;
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
            String specialNeeds
    );

    boolean existsActiveCourse(Long courseId);

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

    void deactivateEnrollment(Long enrollmentId);

    void replaceGuardian(Long enrollmentId, EnrollmentGuardian guardian);

    void replacePickupContacts(Long enrollmentId, List<EnrollmentPickupContact> contacts);

    void replaceDocuments(Long enrollmentId, List<EnrollmentDocument> documents);
}
