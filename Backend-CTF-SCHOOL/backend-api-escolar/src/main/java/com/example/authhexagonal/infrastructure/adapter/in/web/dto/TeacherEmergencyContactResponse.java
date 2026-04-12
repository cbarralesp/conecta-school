package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherEmergencyContact;

public record TeacherEmergencyContactResponse(
        Long id,
        String fullName,
        String relation,
        String phone
) {
    public static TeacherEmergencyContactResponse fromDomain(TeacherEmergencyContact contact) {
        return new TeacherEmergencyContactResponse(
                contact.id(),
                contact.fullName(),
                contact.relation(),
                contact.phone()
        );
    }
}
