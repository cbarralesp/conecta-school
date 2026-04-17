package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.StudentAttendanceDetail;
import com.example.authhexagonal.domain.port.in.GetStudentAttendanceUseCase;
import com.example.authhexagonal.domain.port.out.LoadStudentAttendancePort;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class StudentAttendanceService implements GetStudentAttendanceUseCase {

    private final LoadStudentAttendancePort loadStudentAttendancePort;

    public StudentAttendanceService(LoadStudentAttendancePort loadStudentAttendancePort) {
        this.loadStudentAttendancePort = loadStudentAttendancePort;
    }

    @Override
    public StudentAttendanceDetail getAttendance(String username) {
        return loadStudentAttendancePort.findAttendanceByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Student attendance not found"));
    }
}
