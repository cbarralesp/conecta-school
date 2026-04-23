package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.ActivityCalendarDay;

import java.util.List;

public record ActivityCalendarDayResponse(
        String isoDate,
        int dayOfMonth,
        boolean inCurrentMonth,
        boolean today,
        List<SchoolActivityResponse> activities
) {
    public static ActivityCalendarDayResponse fromDomain(ActivityCalendarDay day) {
        return new ActivityCalendarDayResponse(
                day.isoDate(),
                day.dayOfMonth(),
                day.inCurrentMonth(),
                day.today(),
                day.activities().stream().map(SchoolActivityResponse::fromDomain).toList()
        );
    }
}
