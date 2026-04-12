package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.StudentPortalSubject;

import java.util.List;

public interface GetStudentSubjectsUseCase {

    List<StudentPortalSubject> getSubjects(String username);
}
