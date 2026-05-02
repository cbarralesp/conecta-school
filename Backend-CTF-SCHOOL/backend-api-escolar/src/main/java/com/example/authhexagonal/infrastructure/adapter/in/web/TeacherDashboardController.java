package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.GetTeacherDashboardUseCase;
import com.example.authhexagonal.domain.port.in.ManageTeacherPlanningUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.TeacherDashboardResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.TeacherPlanningDetailResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.TeacherPlanningUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher")
public class TeacherDashboardController {

    private final GetTeacherDashboardUseCase getTeacherDashboardUseCase;
    private final ManageTeacherPlanningUseCase manageTeacherPlanningUseCase;

    public TeacherDashboardController(
            GetTeacherDashboardUseCase getTeacherDashboardUseCase,
            ManageTeacherPlanningUseCase manageTeacherPlanningUseCase
    ) {
        this.getTeacherDashboardUseCase = getTeacherDashboardUseCase;
        this.manageTeacherPlanningUseCase = manageTeacherPlanningUseCase;
    }

    @GetMapping("/dashboard")
    public TeacherDashboardResponse dashboard(Authentication authentication) {
        return TeacherDashboardResponse.fromDomain(
                getTeacherDashboardUseCase.getDashboard(authentication.getName())
        );
    }

    @GetMapping("/plannings/{planningId}")
    public TeacherPlanningDetailResponse planning(
            Authentication authentication,
            @PathVariable("planningId") Long planningId
    ) {
        return TeacherPlanningDetailResponse.fromDomain(
                manageTeacherPlanningUseCase.getPlanning(authentication.getName(), planningId)
        );
    }

    @PutMapping("/plannings/{planningId}")
    public TeacherPlanningDetailResponse updatePlanning(
            Authentication authentication,
            @PathVariable("planningId") Long planningId,
            @Valid @RequestBody TeacherPlanningUpdateRequest request
    ) {
        return TeacherPlanningDetailResponse.fromDomain(
                manageTeacherPlanningUseCase.updatePlanning(
                        authentication.getName(),
                        planningId,
                        request.title(),
                        request.unit(),
                        request.learningObjective(),
                        request.status(),
                        request.classDate(),
                        request.resources(),
                        request.activities(),
                        request.evaluation(),
                        request.observations()
                )
        );
    }
}
