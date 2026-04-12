package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.TeacherDashboard;
import com.example.authhexagonal.domain.port.in.GetTeacherDashboardUseCase;
import com.example.authhexagonal.domain.port.out.LoadTeacherDashboardPort;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class TeacherDashboardService implements GetTeacherDashboardUseCase {

    private final LoadTeacherDashboardPort loadTeacherDashboardPort;

    public TeacherDashboardService(LoadTeacherDashboardPort loadTeacherDashboardPort) {
        this.loadTeacherDashboardPort = loadTeacherDashboardPort;
    }

    @Override
    public TeacherDashboard getDashboard(String username) {
        return loadTeacherDashboardPort.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Teacher dashboard not found"));
    }
}
