package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.TeacherStatistics;

public interface LoadTeacherStatisticsPort {

    TeacherStatistics findByUsername(String username, Integer semester);
}
