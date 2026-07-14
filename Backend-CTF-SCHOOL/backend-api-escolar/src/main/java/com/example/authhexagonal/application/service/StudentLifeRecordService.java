package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.StudentLifeRecord;
import com.example.authhexagonal.domain.model.StudentLifeRecordCommand;
import com.example.authhexagonal.domain.port.in.ManageStudentLifeRecordsUseCase;
import com.example.authhexagonal.domain.port.out.ManageStudentLifeRecordsPort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;

@Service
public class StudentLifeRecordService implements ManageStudentLifeRecordsUseCase {

    private final ManageStudentLifeRecordsPort recordsPort;

    public StudentLifeRecordService(ManageStudentLifeRecordsPort recordsPort) {
        this.recordsPort = recordsPort;
    }

    @Override
    public List<StudentLifeRecord> findByStudentId(Long studentId) {
        validateStudent(studentId);
        return recordsPort.findByStudentId(studentId);
    }

    @Override
    public StudentLifeRecord findById(Long recordId) {
        return recordsPort.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Student life record not found"));
    }

    @Override
    public StudentLifeRecord create(StudentLifeRecordCommand command) {
        return recordsPort.create(normalize(command));
    }

    @Override
    public StudentLifeRecord update(Long recordId, StudentLifeRecordCommand command) {
        findById(recordId);
        return recordsPort.update(recordId, normalize(command));
    }

    @Override
    public void delete(Long recordId) {
        findById(recordId);
        recordsPort.delete(recordId);
    }

    private StudentLifeRecordCommand normalize(StudentLifeRecordCommand command) {
        validateStudent(command.studentId());
        if (!StringUtils.hasText(command.type())) {
            throw new IllegalArgumentException("El tipo de registro es obligatorio");
        }
        if (!StringUtils.hasText(command.category())) {
            throw new IllegalArgumentException("La categoria del registro es obligatoria");
        }

        return new StudentLifeRecordCommand(
                command.studentId(),
                command.enrollmentId(),
                command.date() == null ? LocalDate.now() : command.date(),
                command.time(),
                command.type().trim(),
                command.category().trim(),
                defaultText(command.area(), "General"),
                defaultText(command.responsible(), ""),
                defaultText(command.status(), defaultStatus(command.type())),
                defaultText(command.deadline(), ""),
                defaultText(command.description(), "")
        );
    }

    private void validateStudent(Long studentId) {
        if (studentId == null || !recordsPort.existsStudent(studentId)) {
            throw new ResourceNotFoundException("Student not found");
        }
    }

    private String defaultStatus(String type) {
        return "Acuerdo".equalsIgnoreCase(type) ? "Activo" : "Registrada";
    }

    private String defaultText(String value, String fallback) {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }
}
