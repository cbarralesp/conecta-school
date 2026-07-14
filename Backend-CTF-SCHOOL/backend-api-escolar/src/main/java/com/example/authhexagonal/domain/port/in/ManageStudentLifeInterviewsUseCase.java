package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.StudentLifeInterview;
import com.example.authhexagonal.domain.model.StudentLifeInterviewCommand;

import java.util.List;

public interface ManageStudentLifeInterviewsUseCase {
    List<StudentLifeInterview> findByStudentId(Long studentId);

    StudentLifeInterview findById(Long interviewId);

    StudentLifeInterview create(StudentLifeInterviewCommand command);

    StudentLifeInterview update(Long interviewId, StudentLifeInterviewCommand command);

    void delete(Long interviewId);
}
