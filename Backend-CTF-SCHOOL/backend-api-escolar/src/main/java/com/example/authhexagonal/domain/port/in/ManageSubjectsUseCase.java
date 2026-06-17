package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.AcademicSubject;

import java.util.List;

public interface ManageSubjectsUseCase {

    List<AcademicSubject> findAll(String search, String levelGroup);

    AcademicSubject findById(Long subjectId);

    AcademicSubject create(
            String code,
            String name,
            String area,
            String colorHex,
            String description,
            String referenceLevel,
            String evaluationType,
            int suggestedHours,
            List<Long> teacherIds,
            List<Long> applicableGradeIds,
            List<Long> applicableCourseIds
    );

    AcademicSubject update(
            Long subjectId,
            String code,
            String name,
            String area,
            String colorHex,
            String description,
            String referenceLevel,
            String evaluationType,
            int suggestedHours,
            List<Long> teacherIds,
            List<Long> applicableGradeIds,
            List<Long> applicableCourseIds
    );

    void delete(Long subjectId);
}
