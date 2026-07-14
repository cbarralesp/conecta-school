package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.StudentLifeInterview;
import com.example.authhexagonal.domain.model.StudentLifeInterviewCommand;
import com.example.authhexagonal.domain.port.in.ManageStudentLifeInterviewsUseCase;
import com.example.authhexagonal.domain.port.out.ManageStudentLifeInterviewsPort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;

@Service
public class StudentLifeInterviewService implements ManageStudentLifeInterviewsUseCase {

    private final ManageStudentLifeInterviewsPort interviewsPort;

    public StudentLifeInterviewService(ManageStudentLifeInterviewsPort interviewsPort) {
        this.interviewsPort = interviewsPort;
    }

    @Override
    public List<StudentLifeInterview> findByStudentId(Long studentId) {
        validateStudent(studentId);
        return interviewsPort.findByStudentId(studentId);
    }

    @Override
    public StudentLifeInterview findById(Long interviewId) {
        return interviewsPort.findById(interviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found"));
    }

    @Override
    public StudentLifeInterview create(StudentLifeInterviewCommand command) {
        return interviewsPort.create(normalize(command));
    }

    @Override
    public StudentLifeInterview update(Long interviewId, StudentLifeInterviewCommand command) {
        findById(interviewId);
        return interviewsPort.update(interviewId, normalize(command));
    }

    @Override
    public void delete(Long interviewId) {
        findById(interviewId);
        interviewsPort.delete(interviewId);
    }

    private StudentLifeInterviewCommand normalize(StudentLifeInterviewCommand command) {
        validateStudent(command.studentId());
        if (!StringUtils.hasText(command.reason())) {
            throw new IllegalArgumentException("El motivo de la entrevista es obligatorio");
        }

        return new StudentLifeInterviewCommand(
                command.studentId(),
                command.enrollmentId(),
                command.date() == null ? LocalDate.now() : command.date(),
                command.time(),
                defaultText(command.type(), "Apoderado"),
                command.participants() == null ? List.of() : command.participants(),
                command.reason().trim(),
                defaultText(command.responsible(), ""),
                defaultText(command.responsibleRole(), ""),
                defaultText(command.status(), "Realizada"),
                defaultText(command.summary(), ""),
                defaultText(command.agreements(), "")
        );
    }

    private void validateStudent(Long studentId) {
        if (studentId == null || !interviewsPort.existsStudent(studentId)) {
            throw new ResourceNotFoundException("Student not found");
        }
    }

    private String defaultText(String value, String fallback) {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }
}
