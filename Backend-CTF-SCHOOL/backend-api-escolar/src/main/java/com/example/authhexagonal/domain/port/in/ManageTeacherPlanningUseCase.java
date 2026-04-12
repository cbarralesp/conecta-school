package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.TeacherPlanningDetail;

import java.time.LocalDate;

public interface ManageTeacherPlanningUseCase {

    TeacherPlanningDetail getPlanning(String username, Long planningId);

    TeacherPlanningDetail updatePlanning(
            String username,
            Long planningId,
            String title,
            String unit,
            String learningObjective,
            String status,
            LocalDate classDate,
            String resources,
            String activities,
            String evaluation,
            String observations
    );
}
