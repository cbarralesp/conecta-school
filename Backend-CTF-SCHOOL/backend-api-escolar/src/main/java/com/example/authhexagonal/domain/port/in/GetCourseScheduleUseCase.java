package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.CourseScheduleAssignment;

import java.util.List;

public interface GetCourseScheduleUseCase {

    List<CourseScheduleAssignment> findAll();
}
