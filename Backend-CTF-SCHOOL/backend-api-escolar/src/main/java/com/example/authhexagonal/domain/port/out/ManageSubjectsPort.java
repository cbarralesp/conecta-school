package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.AcademicSubject;

import java.util.List;
import java.util.Optional;

public interface ManageSubjectsPort {

    List<AcademicSubject> findAllActiveSubjects(String search, String levelGroup);

    Optional<AcademicSubject> findActiveSubjectById(Long subjectId);

    boolean existsActiveSubjectByCode(String code);

    boolean existsActiveSubjectByCodeExcludingId(String code, Long subjectId);

    AcademicSubject createSubject(
            String code,
            String name,
            String area,
            String colorHex,
            String description,
            String referenceLevel,
            int suggestedHours,
            List<Long> teacherIds
    );

    AcademicSubject updateSubject(
            Long subjectId,
            String code,
            String name,
            String area,
            String colorHex,
            String description,
            String referenceLevel,
            int suggestedHours,
            List<Long> teacherIds
    );

    void deactivateSubject(Long subjectId);
}
