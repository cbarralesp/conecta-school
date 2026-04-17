package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.GetStudentAttendanceUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.StudentAttendanceResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student/attendance")
public class StudentAttendanceController {

    private final GetStudentAttendanceUseCase getStudentAttendanceUseCase;

    public StudentAttendanceController(GetStudentAttendanceUseCase getStudentAttendanceUseCase) {
        this.getStudentAttendanceUseCase = getStudentAttendanceUseCase;
    }

    @GetMapping
    public StudentAttendanceResponse detail(Authentication authentication) {
        return StudentAttendanceResponse.fromDomain(
                getStudentAttendanceUseCase.getAttendance(authentication.getName())
        );
    }
}
