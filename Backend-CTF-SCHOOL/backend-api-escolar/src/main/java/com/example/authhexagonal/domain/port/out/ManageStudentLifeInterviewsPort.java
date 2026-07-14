package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.StudentLifeInterview;
import com.example.authhexagonal.domain.model.StudentLifeInterviewCommand;

import java.util.List;
import java.util.Optional;

public interface ManageStudentLifeInterviewsPort {
    boolean existsStudent(Long studentId);

    List<StudentLifeInterview> findByStudentId(Long studentId);

    StudentLifeInterview create(StudentLifeInterviewCommand command);

    Optional<StudentLifeInterview> findById(Long interviewId);

    StudentLifeInterview update(Long interviewId, StudentLifeInterviewCommand command);

    void delete(Long interviewId);
}
