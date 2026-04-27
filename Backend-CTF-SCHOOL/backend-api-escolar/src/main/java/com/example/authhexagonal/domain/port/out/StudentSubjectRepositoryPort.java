package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.StudentPortalSubject;
import com.example.authhexagonal.domain.model.StudentSubjectDocumentRow;
import com.example.authhexagonal.domain.model.StudentSubjectHeader;

import java.util.List;
import java.util.Optional;

public interface StudentSubjectRepositoryPort {

    List<StudentPortalSubject> findSubjects(String username);

    Optional<StudentSubjectHeader> findSubjectHeader(String username, Long subjectId);

    List<StudentSubjectDocumentRow> findSubjectDocumentRows(String username, Long subjectId);
}
