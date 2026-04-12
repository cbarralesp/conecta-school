package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.AcademicSubject;

import java.util.List;

public interface ManageSubjectsUseCase {

    List<AcademicSubject> findAll();

    AcademicSubject findById(Long subjectId);

    AcademicSubject create(
            String code,
            String name,
            String area,
            String colorHex,
            String description,
            String referenceLevel,
            int suggestedHours
    );

    AcademicSubject update(
            Long subjectId,
            String code,
            String name,
            String area,
            String colorHex,
            String description,
            String referenceLevel,
            int suggestedHours
    );

    void delete(Long subjectId);
}
