package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.AttendanceCatalog;
import com.example.authhexagonal.domain.model.AttendanceStudentSummary;
import com.example.authhexagonal.domain.model.DailyAttendanceCommand;
import com.example.authhexagonal.domain.model.DailyAttendanceView;
import com.example.authhexagonal.domain.model.MonthlyAttendanceView;
import com.example.authhexagonal.domain.model.WeeklyAttendanceView;
import com.example.authhexagonal.domain.port.in.ManageAttendanceUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.SaveDailyAttendanceRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/asistencia")
public class AttendanceController {

    private final ManageAttendanceUseCase manageAttendanceUseCase;

    public AttendanceController(ManageAttendanceUseCase manageAttendanceUseCase) {
        this.manageAttendanceUseCase = manageAttendanceUseCase;
    }

    @GetMapping("/catalogo")
    public AttendanceCatalog catalog() {
        return manageAttendanceUseCase.getCatalog();
    }

    @GetMapping("/diaria")
    public DailyAttendanceView daily(
            @RequestParam("courseId") Long courseId,
            @RequestParam("date") LocalDate date
    ) {
        return manageAttendanceUseCase.getDailyAttendance(courseId, date);
    }

    @PutMapping("/diaria")
    public DailyAttendanceView saveDaily(@Valid @RequestBody SaveDailyAttendanceRequest request) {
        List<DailyAttendanceCommand> commands = request.entries() == null
                ? List.of()
                : request.entries().stream()
                .map(entry -> new DailyAttendanceCommand(entry.studentId(), entry.status(), entry.arrivalTime(), entry.note()))
                .toList();
        return manageAttendanceUseCase.saveDailyAttendance(
                request.courseId(),
                request.date(),
                request.classSuspended() != null && request.classSuspended(),
                request.suspensionReason(),
                commands
        );
    }

    @GetMapping("/semanal")
    public WeeklyAttendanceView weekly(
            @RequestParam("courseId") Long courseId,
            @RequestParam("startDate") LocalDate startDate
    ) {
        return manageAttendanceUseCase.getWeeklyAttendance(courseId, startDate);
    }

    @GetMapping("/mensual")
    public MonthlyAttendanceView monthly(
            @RequestParam("courseId") Long courseId,
            @RequestParam("month") String month
    ) {
        return manageAttendanceUseCase.getMonthlyAttendance(courseId, YearMonth.parse(month));
    }

    @GetMapping("/resumen-estudiante")
    public AttendanceStudentSummary studentSummary(
            @RequestParam("courseId") Long courseId,
            @RequestParam("studentId") Long studentId,
            @RequestParam("schoolYear") int schoolYear,
            @RequestParam("semester") int semester
    ) {
        return manageAttendanceUseCase.getStudentAttendanceSummary(courseId, studentId, schoolYear, semester);
    }
}
