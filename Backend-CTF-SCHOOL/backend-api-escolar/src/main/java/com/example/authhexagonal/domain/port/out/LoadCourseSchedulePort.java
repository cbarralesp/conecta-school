package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.CourseScheduleAssignment;

import java.util.List;

public interface LoadCourseSchedulePort {

    List<CourseScheduleAssignment> findAllScheduleAssignments();
}
