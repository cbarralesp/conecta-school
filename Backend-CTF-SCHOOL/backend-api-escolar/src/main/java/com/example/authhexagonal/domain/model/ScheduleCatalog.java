package com.example.authhexagonal.domain.model;

import java.util.List;

public record ScheduleCatalog(
        List<ScheduleCourseOption> courses,
        List<SchedulePeriodOption> periods,
        List<ScheduleTeacherOption> teachers,
        List<AcademicSubject> subjects,
        List<ScheduleBlock> blocks
) {
}
