package com.example.authhexagonal.domain.model;

public record DailyAttendanceRegisterState(
        boolean classSuspended,
        String suspensionReason
) {
}
