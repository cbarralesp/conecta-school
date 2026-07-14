package com.example.authhexagonal.domain.model;

import java.time.LocalDate;
import java.time.LocalTime;

public record StudentLifeRecordCommand(
        Long studentId,
        Long enrollmentId,
        LocalDate date,
        LocalTime time,
        String type,
        String category,
        String area,
        String responsible,
        String status,
        String deadline,
        String description
) {
}
