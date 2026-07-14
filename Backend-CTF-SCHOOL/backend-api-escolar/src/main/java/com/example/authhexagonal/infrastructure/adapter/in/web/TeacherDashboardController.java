package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.GetTeacherDashboardUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.TeacherDashboardResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher")
public class TeacherDashboardController {

    private final GetTeacherDashboardUseCase getTeacherDashboardUseCase;

    public TeacherDashboardController(GetTeacherDashboardUseCase getTeacherDashboardUseCase) {
        this.getTeacherDashboardUseCase = getTeacherDashboardUseCase;
    }

    @GetMapping("/dashboard")
    public TeacherDashboardResponse dashboard(Authentication authentication) {
        return TeacherDashboardResponse.fromDomain(
                getTeacherDashboardUseCase.getDashboard(authentication.getName())
        );
    }
}
