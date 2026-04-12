package com.example.authhexagonal.domain.model;

import java.util.List;

public record GradeCatalog(
        List<GradeCourseOption> courses,
        List<GradePeriodOption> periods
) {
}
