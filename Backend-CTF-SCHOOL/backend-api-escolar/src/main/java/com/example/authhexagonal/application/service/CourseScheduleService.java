package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.CourseScheduleAssignment;
import com.example.authhexagonal.domain.port.in.GetCourseScheduleUseCase;
import com.example.authhexagonal.domain.port.out.LoadCourseSchedulePort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CourseScheduleService implements GetCourseScheduleUseCase {

    private final LoadCourseSchedulePort loadCourseSchedulePort;

    public CourseScheduleService(LoadCourseSchedulePort loadCourseSchedulePort) {
        this.loadCourseSchedulePort = loadCourseSchedulePort;
    }

    @Override
    public List<CourseScheduleAssignment> findAll() {
        return loadCourseSchedulePort.findAllScheduleAssignments();
    }
}
