package com.example.authhexagonal.domain.model;

import java.util.List;

public record TeacherOverview(
        TeacherSummary summary,
        List<AcademicSubject> subjects,
        List<TeacherListItem> teachers
) {
}
