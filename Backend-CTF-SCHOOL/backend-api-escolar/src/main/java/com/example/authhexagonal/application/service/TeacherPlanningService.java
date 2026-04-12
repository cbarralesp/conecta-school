package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.TeacherPlanningDetail;
import com.example.authhexagonal.domain.port.in.ManageTeacherPlanningUseCase;
import com.example.authhexagonal.domain.port.out.ManageTeacherPlanningPort;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class TeacherPlanningService implements ManageTeacherPlanningUseCase {

    private final ManageTeacherPlanningPort manageTeacherPlanningPort;

    public TeacherPlanningService(ManageTeacherPlanningPort manageTeacherPlanningPort) {
        this.manageTeacherPlanningPort = manageTeacherPlanningPort;
    }

    @Override
    public TeacherPlanningDetail getPlanning(String username, Long planningId) {
        return manageTeacherPlanningPort.findPlanningByUsernameAndId(username, planningId)
                .orElseThrow(() -> new UsernameNotFoundException("Planning not found"));
    }

    @Override
    public TeacherPlanningDetail updatePlanning(
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
    ) {
        return manageTeacherPlanningPort.updatePlanning(
                        username,
                        planningId,
                        title,
                        unit,
                        learningObjective,
                        status,
                        classDate,
                        resources,
                        activities,
                        evaluation,
                        observations
                )
                .orElseThrow(() -> new UsernameNotFoundException("Planning not found"));
    }
}
