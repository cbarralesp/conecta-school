package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.StudentAttendanceDetail;

public interface GetStudentAttendanceUseCase {

    StudentAttendanceDetail getAttendance(String username);
}
