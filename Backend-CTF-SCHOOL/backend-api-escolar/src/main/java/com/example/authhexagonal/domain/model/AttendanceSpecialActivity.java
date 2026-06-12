package com.example.authhexagonal.domain.model;

import java.time.LocalDate;

public record AttendanceSpecialActivity(
        String typeCode,
        String title,
        LocalDate startDate,
        LocalDate endDate
) {
}
