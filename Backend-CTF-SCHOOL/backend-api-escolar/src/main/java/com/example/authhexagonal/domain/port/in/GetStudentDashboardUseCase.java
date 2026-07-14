package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.StudentDashboard;

public interface GetStudentDashboardUseCase {

    StudentDashboard getDashboard(String username, Integer schoolYear, Integer semester);
}
