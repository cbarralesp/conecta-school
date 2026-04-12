package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.AcademicSubject;
import com.example.authhexagonal.domain.port.in.ManageSubjectsUseCase;
import com.example.authhexagonal.domain.port.out.ManageSubjectsPort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SubjectService implements ManageSubjectsUseCase {

    private final ManageSubjectsPort manageSubjectsPort;

    public SubjectService(ManageSubjectsPort manageSubjectsPort) {
        this.manageSubjectsPort = manageSubjectsPort;
    }

    @Override
    public List<AcademicSubject> findAll() {
        return manageSubjectsPort.findAllActiveSubjects();
    }

    @Override
    public AcademicSubject findById(Long subjectId) {
        return manageSubjectsPort.findActiveSubjectById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
    }

    @Override
    public AcademicSubject create(
            String code,
            String name,
            String area,
            String colorHex,
            String description,
            String referenceLevel,
            int suggestedHours
    ) {
        validateDuplicateCode(code, null);
        return manageSubjectsPort.createSubject(
                code,
                name,
                area,
                colorHex,
                description,
                referenceLevel,
                suggestedHours
        );
    }

    @Override
    public AcademicSubject update(
            Long subjectId,
            String code,
            String name,
            String area,
            String colorHex,
            String description,
            String referenceLevel,
            int suggestedHours
    ) {
        findById(subjectId);
        validateDuplicateCode(code, subjectId);
        return manageSubjectsPort.updateSubject(
                subjectId,
                code,
                name,
                area,
                colorHex,
                description,
                referenceLevel,
                suggestedHours
        );
    }

    @Override
    public void delete(Long subjectId) {
        findById(subjectId);
        if (manageSubjectsPort.hasActiveTeachingLoad(subjectId)) {
            throw new IllegalArgumentException("Subject has active schedule loads and cannot be deactivated");
        }
        manageSubjectsPort.deactivateSubject(subjectId);
    }

    private void validateDuplicateCode(String code, Long subjectId) {
        boolean exists = subjectId == null
                ? manageSubjectsPort.existsActiveSubjectByCode(code)
                : manageSubjectsPort.existsActiveSubjectByCodeExcludingId(code, subjectId);

        if (exists) {
            throw new IllegalArgumentException("Subject code already exists");
        }
    }
}
