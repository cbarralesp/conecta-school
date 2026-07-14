package com.example.authhexagonal.domain.model;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record StudentLifeInterview(
        Long id,
        Long studentId,
        Long enrollmentId,
        LocalDate date,
        LocalTime time,
        String type,
        List<String> participants,
        String reason,
        String responsible,
        String responsibleRole,
        String status,
        String summary,
        String agreements
) {
}
