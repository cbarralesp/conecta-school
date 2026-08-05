package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.TeacherStatistics;
import com.example.authhexagonal.domain.port.in.GetTeacherStatisticsUseCase;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher")
public class TeacherStatisticsController {

    private final GetTeacherStatisticsUseCase getTeacherStatisticsUseCase;

    public TeacherStatisticsController(GetTeacherStatisticsUseCase getTeacherStatisticsUseCase) {
        this.getTeacherStatisticsUseCase = getTeacherStatisticsUseCase;
    }

    @GetMapping("/statistics")
    public TeacherStatistics statistics(
            Authentication authentication,
            @RequestParam(name = "semester", required = false) Integer semester
    ) {
        return getTeacherStatisticsUseCase.getStatistics(authentication.getName(), semester);
    }
}
