package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.AttendanceCourseOption;
import com.example.authhexagonal.domain.model.AttendanceRecordEntry;
import com.example.authhexagonal.domain.model.AttendanceSpecialActivity;
import com.example.authhexagonal.domain.model.AttendanceStudentSummary;
import com.example.authhexagonal.domain.model.AttendanceStudentInfo;
import com.example.authhexagonal.domain.model.DailyAttendanceRegisterState;
import com.example.authhexagonal.domain.model.DailyAttendanceCommand;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface ManageAttendancePort {

    List<AttendanceCourseOption> findAttendanceCourses();

    Optional<AttendanceCourseOption> findAttendanceCourseById(Long courseId);

    List<AttendanceStudentInfo> findActiveStudentsByCourse(Long courseId);

    List<AttendanceRecordEntry> findAttendanceEntriesByCourseAndPeriod(Long courseId, LocalDate startDate, LocalDate endDate);

    Optional<DailyAttendanceRegisterState> findDailyAttendanceRegisterState(Long courseId, LocalDate date);

    Set<LocalDate> findSuspendedClassDatesByCourseAndPeriod(Long courseId, LocalDate startDate, LocalDate endDate);

    List<AttendanceSpecialActivity> findSpecialActivitiesByCourseAndPeriod(Long courseId, LocalDate startDate, LocalDate endDate);

    int countRecordedSchoolDays(Long courseId, LocalDate startDate, LocalDate endDate);

    AttendanceStudentSummary findStudentAttendanceSummary(Long courseId, Long studentId, LocalDate startDate, LocalDate endDate);

    void saveDailyAttendance(Long courseId, LocalDate date, boolean classSuspended, String suspensionReason, List<DailyAttendanceCommand> commands);
}
