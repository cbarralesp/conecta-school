package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentLifeInterview;

import java.util.List;

public record StudentLifeInterviewResponse(
        Long id,
        Long studentId,
        Long enrollmentId,
        String date,
        String time,
        String type,
        List<String> participants,
        String reason,
        String responsible,
        String responsibleRole,
        String status,
        String summary,
        String agreements
) {
    public static StudentLifeInterviewResponse fromDomain(StudentLifeInterview interview) {
        return new StudentLifeInterviewResponse(
                interview.id(),
                interview.studentId(),
                interview.enrollmentId(),
                interview.date() == null ? null : interview.date().toString(),
                interview.time() == null ? null : interview.time().toString().substring(0, 5),
                interview.type(),
                interview.participants(),
                interview.reason(),
                interview.responsible(),
                interview.responsibleRole(),
                interview.status(),
                interview.summary(),
                interview.agreements()
        );
    }
}
