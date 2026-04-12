package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.TeacherDashboard;

public interface GetTeacherDashboardUseCase {

    TeacherDashboard getDashboard(String username);
}
