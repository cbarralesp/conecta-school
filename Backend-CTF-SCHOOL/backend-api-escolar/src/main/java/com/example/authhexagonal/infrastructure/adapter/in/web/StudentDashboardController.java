package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.GetStudentDashboardUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.StudentDashboardResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student")
public class StudentDashboardController {

    private final GetStudentDashboardUseCase getStudentDashboardUseCase;

    public StudentDashboardController(GetStudentDashboardUseCase getStudentDashboardUseCase) {
        this.getStudentDashboardUseCase = getStudentDashboardUseCase;
    }

    @GetMapping("/dashboard")
    public StudentDashboardResponse dashboard(Authentication authentication) {
        return StudentDashboardResponse.fromDomain(
                getStudentDashboardUseCase.getDashboard(authentication.getName())
        );
    }
}
