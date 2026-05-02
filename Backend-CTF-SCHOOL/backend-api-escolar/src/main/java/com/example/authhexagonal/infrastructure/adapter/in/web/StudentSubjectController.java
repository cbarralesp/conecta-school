package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.GetStudentSubjectDocumentsUseCase;
import com.example.authhexagonal.domain.port.in.GetStudentSubjectsUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.StudentPortalSubjectResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.StudentSubjectDocumentsResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/student/subjects")
public class StudentSubjectController {

    private final GetStudentSubjectsUseCase getStudentSubjectsUseCase;
    private final GetStudentSubjectDocumentsUseCase getStudentSubjectDocumentsUseCase;

    public StudentSubjectController(
            GetStudentSubjectsUseCase getStudentSubjectsUseCase,
            GetStudentSubjectDocumentsUseCase getStudentSubjectDocumentsUseCase
    ) {
        this.getStudentSubjectsUseCase = getStudentSubjectsUseCase;
        this.getStudentSubjectDocumentsUseCase = getStudentSubjectDocumentsUseCase;
    }

    @GetMapping
    public List<StudentPortalSubjectResponse> list(Authentication authentication) {
        return getStudentSubjectsUseCase.getSubjects(authentication.getName()).stream()
                .map(StudentPortalSubjectResponse::fromDomain)
                .toList();
    }

    @GetMapping("/{subjectId}/documents")
    public StudentSubjectDocumentsResponse detail(
            Authentication authentication,
            @PathVariable("subjectId") Long subjectId
    ) {
        return StudentSubjectDocumentsResponse.fromDomain(
                getStudentSubjectDocumentsUseCase.getDocuments(authentication.getName(), subjectId)
        );
    }
}
