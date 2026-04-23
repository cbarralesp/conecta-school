package com.example.authhexagonal.domain.model;

import java.util.List;

public record ActivityCalendarDay(
        String isoDate,
        int dayOfMonth,
        boolean inCurrentMonth,
        boolean today,
        List<SchoolActivity> activities
) {
}
