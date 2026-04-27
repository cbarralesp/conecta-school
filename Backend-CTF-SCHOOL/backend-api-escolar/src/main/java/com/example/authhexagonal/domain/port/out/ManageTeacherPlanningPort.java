package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.TeacherPlanningDetail;

import java.time.LocalDate;
import java.util.Optional;

public interface ManageTeacherPlanningPort {

    Optional<TeacherPlanningDetail> findPlanningByUsernameAndId(String username, Long planningId);

    Optional<TeacherPlanningDetail> updatePlanning(
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
