package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.TeacherDashboard;

import java.util.Optional;

public interface LoadTeacherDashboardPort {

    Optional<TeacherDashboard> findByUsername(String username);
}
