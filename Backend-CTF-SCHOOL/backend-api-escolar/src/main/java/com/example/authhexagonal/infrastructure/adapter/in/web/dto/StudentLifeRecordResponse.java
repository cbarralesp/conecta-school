package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentLifeRecord;

public record StudentLifeRecordResponse(
        Long id,
        Long studentId,
        Long enrollmentId,
        String date,
        String time,
        String type,
        String category,
        String area,
        String responsible,
        String status,
        String deadline,
        String description
) {
    public static StudentLifeRecordResponse fromDomain(StudentLifeRecord record) {
        return new StudentLifeRecordResponse(
                record.id(),
                record.studentId(),
                record.enrollmentId(),
                record.date() == null ? null : record.date().toString(),
                record.time() == null ? null : record.time().toString().substring(0, 5),
                record.type(),
                record.category(),
                record.area(),
                record.responsible(),
                record.status(),
                record.deadline(),
                record.description()
        );
    }
}
