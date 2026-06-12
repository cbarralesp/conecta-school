package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.AttendanceCatalog;
import com.example.authhexagonal.domain.model.AttendanceStudentSummary;
import com.example.authhexagonal.domain.model.DailyAttendanceCommand;
import com.example.authhexagonal.domain.model.DailyAttendanceView;
import com.example.authhexagonal.domain.model.MonthlyAttendanceView;
import com.example.authhexagonal.domain.model.WeeklyAttendanceView;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

public interface ManageAttendanceUseCase {

    AttendanceCatalog getCatalog();

    DailyAttendanceView getDailyAttendance(Long courseId, LocalDate date);

    DailyAttendanceView saveDailyAttendance(Long courseId, LocalDate date, boolean classSuspended, String suspensionReason, List<DailyAttendanceCommand> commands);

    WeeklyAttendanceView getWeeklyAttendance(Long courseId, LocalDate weekStart);

    MonthlyAttendanceView getMonthlyAttendance(Long courseId, YearMonth month);

    AttendanceStudentSummary getStudentAttendanceSummary(Long courseId, Long studentId, int schoolYear, int semester);
}
