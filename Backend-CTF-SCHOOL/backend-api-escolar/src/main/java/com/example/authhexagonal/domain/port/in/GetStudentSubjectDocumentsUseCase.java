package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.StudentSubjectDocuments;

public interface GetStudentSubjectDocumentsUseCase {

    StudentSubjectDocuments getDocuments(String username, Long subjectId);
}
