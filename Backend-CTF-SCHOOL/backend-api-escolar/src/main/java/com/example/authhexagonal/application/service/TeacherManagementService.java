package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.TeacherCommand;
import com.example.authhexagonal.domain.model.TeacherOverview;
import com.example.authhexagonal.domain.model.TeacherRecord;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.TeacherAccessPreviewResponse;
import com.example.authhexagonal.infrastructure.adapter.out.persistence.TeacherJdbcAdapter;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TeacherManagementService {

    private final TeacherJdbcAdapter teacherJdbcAdapter;
    private final PasswordEncoder passwordEncoder;

    public TeacherManagementService(TeacherJdbcAdapter teacherJdbcAdapter, PasswordEncoder passwordEncoder) {
        this.teacherJdbcAdapter = teacherJdbcAdapter;
        this.passwordEncoder = passwordEncoder;
    }

    public TeacherOverview getOverview(String search, Long subjectId, String status) {
        return teacherJdbcAdapter.findOverview(search, subjectId, status);
    }

    public TeacherRecord findById(Long teacherId) {
        return teacherJdbcAdapter.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
    }

    public TeacherRecord create(TeacherCommand command) {
        validateRun(command.run(), null);
        return teacherJdbcAdapter.createTeacher(command, encodePassword(command));
    }

    public TeacherRecord update(Long teacherId, TeacherCommand command) {
        findById(teacherId);
        validateRun(command.run(), teacherId);
        return teacherJdbcAdapter.updateTeacher(teacherId, command, encodePassword(command));
    }

    public TeacherAccessPreviewResponse previewSystemAccessUsername(
            String run,
            String firstNames,
            String paternalLastName,
            String maternalLastName,
            String staffType
    ) {
        return new TeacherAccessPreviewResponse(
                teacherJdbcAdapter.previewStaffUsername(run, firstNames, paternalLastName, maternalLastName, staffType)
        );
    }

    @Transactional
    public void delete(Long teacherId) {
        findById(teacherId);
        teacherJdbcAdapter.deleteTeacherPermanently(teacherId);
    }

    private void validateRun(String run, Long excludeTeacherId) {
        if (teacherJdbcAdapter.existsTeacherRun(run, excludeTeacherId)) {
            throw new IllegalArgumentException("Teacher RUN already exists");
        }
    }

    private String encodePassword(TeacherCommand command) {
        if (command.systemAccess() == null || !command.systemAccess().configureAccess() || !command.systemAccess().createAccount()) {
            return null;
        }
        String rawPassword = command.systemAccess().temporaryPassword();
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("Temporary password is required when system access is enabled");
        }
        return passwordEncoder.encode(rawPassword.trim());
    }
}
