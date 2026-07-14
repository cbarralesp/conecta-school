package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.StudentDashboard;

import java.util.Optional;

public interface LoadStudentDashboardPort {

    Optional<StudentDashboard> findByUsername(String username, Integer schoolYear, Integer semester);
}
