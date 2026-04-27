package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.StudentAttendanceDetail;

import java.util.Optional;

public interface LoadStudentAttendancePort {

    Optional<StudentAttendanceDetail> findAttendanceByUsername(String username);
}
