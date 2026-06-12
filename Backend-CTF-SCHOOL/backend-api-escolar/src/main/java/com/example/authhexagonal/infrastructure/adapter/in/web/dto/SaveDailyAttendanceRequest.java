package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record SaveDailyAttendanceRequest(
        @NotNull Long courseId,
        @NotNull LocalDate date,
        Boolean classSuspended,
        String suspensionReason,
        List<DailyAttendanceEntryRequest> entries
) {
}
