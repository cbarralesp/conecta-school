package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.AttendanceCourseOption;
import com.example.authhexagonal.domain.model.AttendanceRecordEntry;
import com.example.authhexagonal.domain.model.AttendanceStudentInfo;
import com.example.authhexagonal.domain.model.DailyAttendanceCommand;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ManageAttendancePort {

    List<AttendanceCourseOption> findAttendanceCourses();

    Optional<AttendanceCourseOption> findAttendanceCourseById(Long courseId);

    List<AttendanceStudentInfo> findActiveStudentsByCourse(Long courseId);

    List<AttendanceRecordEntry> findAttendanceEntriesByCourseAndPeriod(Long courseId, LocalDate startDate, LocalDate endDate);

    int countRecordedSchoolDays(Long courseId, LocalDate startDate, LocalDate endDate);

    void saveDailyAttendance(Long courseId, LocalDate date, List<DailyAttendanceCommand> commands);
}
