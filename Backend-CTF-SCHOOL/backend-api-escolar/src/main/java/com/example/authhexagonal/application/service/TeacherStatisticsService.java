package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.TeacherStatistics;
import com.example.authhexagonal.domain.port.in.GetTeacherStatisticsUseCase;
import com.example.authhexagonal.domain.port.out.LoadTeacherStatisticsPort;
import org.springframework.stereotype.Service;

@Service
public class TeacherStatisticsService implements GetTeacherStatisticsUseCase {

    private final LoadTeacherStatisticsPort loadTeacherStatisticsPort;

    public TeacherStatisticsService(LoadTeacherStatisticsPort loadTeacherStatisticsPort) {
        this.loadTeacherStatisticsPort = loadTeacherStatisticsPort;
    }

    @Override
    public TeacherStatistics getStatistics(String username, Integer semester) {
        return loadTeacherStatisticsPort.findByUsername(username, semester);
    }
}
