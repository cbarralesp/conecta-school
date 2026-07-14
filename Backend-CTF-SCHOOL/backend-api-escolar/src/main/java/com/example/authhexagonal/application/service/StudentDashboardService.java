package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.StudentDashboard;
import com.example.authhexagonal.domain.port.in.GetStudentDashboardUseCase;
import com.example.authhexagonal.domain.port.out.LoadStudentDashboardPort;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class StudentDashboardService implements GetStudentDashboardUseCase {

    private final LoadStudentDashboardPort loadStudentDashboardPort;

    public StudentDashboardService(LoadStudentDashboardPort loadStudentDashboardPort) {
        this.loadStudentDashboardPort = loadStudentDashboardPort;
    }

    @Override
    public StudentDashboard getDashboard(String username, Integer schoolYear, Integer semester) {
        return loadStudentDashboardPort.findByUsername(username, schoolYear, semester)
                .orElseThrow(() -> new UsernameNotFoundException("Student dashboard not found"));
    }
}
