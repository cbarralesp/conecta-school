package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.TeacherStatistics;

public interface GetTeacherStatisticsUseCase {

    TeacherStatistics getStatistics(String username, Integer semester);
}
