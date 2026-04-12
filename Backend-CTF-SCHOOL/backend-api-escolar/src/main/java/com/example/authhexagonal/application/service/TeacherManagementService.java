package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.TeacherCommand;
import com.example.authhexagonal.domain.model.TeacherOverview;
import com.example.authhexagonal.domain.model.TeacherRecord;
import com.example.authhexagonal.infrastructure.adapter.out.persistence.TeacherJdbcAdapter;
import org.springframework.stereotype.Service;

@Service
public class TeacherManagementService {

    private final TeacherJdbcAdapter teacherJdbcAdapter;

    public TeacherManagementService(TeacherJdbcAdapter teacherJdbcAdapter) {
        this.teacherJdbcAdapter = teacherJdbcAdapter;
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
        return teacherJdbcAdapter.createTeacher(command);
    }

    public TeacherRecord update(Long teacherId, TeacherCommand command) {
        findById(teacherId);
        validateRun(command.run(), teacherId);
        return teacherJdbcAdapter.updateTeacher(teacherId, command);
    }

    public void delete(Long teacherId) {
        findById(teacherId);
        teacherJdbcAdapter.deactivateTeacher(teacherId);
    }

    private void validateRun(String run, Long excludeTeacherId) {
        if (teacherJdbcAdapter.existsTeacherRun(run, excludeTeacherId)) {
            throw new IllegalArgumentException("Teacher RUN already exists");
        }
    }
}
