package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.AttendanceAlert;
import com.example.authhexagonal.domain.model.AttendanceCatalog;
import com.example.authhexagonal.domain.model.AttendanceCourseOption;
import com.example.authhexagonal.domain.model.AttendanceRecordEntry;
import com.example.authhexagonal.domain.model.AttendanceSpecialActivity;
import com.example.authhexagonal.domain.model.AttendanceStudentInfo;
import com.example.authhexagonal.domain.model.AttendanceStudentSummary;
import com.example.authhexagonal.domain.model.DailyAttendanceSummary;
import com.example.authhexagonal.domain.model.DailyAttendanceCommand;
import com.example.authhexagonal.domain.model.DailyAttendanceRegisterState;
import com.example.authhexagonal.domain.model.DailyAttendanceItem;
import com.example.authhexagonal.domain.model.DailyAttendanceView;
import com.example.authhexagonal.domain.model.MonthlyAttendanceStudent;
import com.example.authhexagonal.domain.model.MonthlyAttendanceStudentDay;
import com.example.authhexagonal.domain.model.MonthlyAttendanceDaySummary;
import com.example.authhexagonal.domain.model.MonthlyAttendanceDistribution;
import com.example.authhexagonal.domain.model.MonthlyAttendanceSpecialDate;
import com.example.authhexagonal.domain.model.MonthlyAttendanceView;
import com.example.authhexagonal.domain.model.WeeklyAttendanceDay;
import com.example.authhexagonal.domain.model.WeeklyAttendanceStudent;
import com.example.authhexagonal.domain.model.WeeklyAttendanceSummary;
import com.example.authhexagonal.domain.model.WeeklyAttendanceView;
import com.example.authhexagonal.domain.port.in.ManageAttendanceUseCase;
import com.example.authhexagonal.domain.port.out.ManageAttendancePort;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.Set;

@Service
public class AttendanceManagementService implements ManageAttendanceUseCase {

    private static final Locale CHILE = new Locale("es", "CL");

    private final ManageAttendancePort manageAttendancePort;

    public AttendanceManagementService(ManageAttendancePort manageAttendancePort) {
        this.manageAttendancePort = manageAttendancePort;
    }

    @Override
    public AttendanceCatalog getCatalog() {
        return new AttendanceCatalog(manageAttendancePort.findAttendanceCourses());
    }

    @Override
    public DailyAttendanceView getDailyAttendance(Long courseId, LocalDate date) {
        AttendanceCourseOption course = findCourse(courseId);
        LocalDate targetDate = normalizeDate(date);
        List<AttendanceStudentInfo> students = manageAttendancePort.findActiveStudentsByCourse(courseId);
        DailyAttendanceRegisterState registerState = manageAttendancePort.findDailyAttendanceRegisterState(courseId, targetDate)
                .orElse(new DailyAttendanceRegisterState(false, null));
        Map<Long, AttendanceRecordEntry> entries = indexByStudent(
                manageAttendancePort.findAttendanceEntriesByCourseAndPeriod(courseId, targetDate, targetDate)
        );

        List<DailyAttendanceItem> items = students.stream()
                .map(student -> mapDailyItem(student, entries.get(student.studentId())))
                .sorted(Comparator.comparing(DailyAttendanceItem::fullName))
                .toList();

        int presentCount = countByStatus(items, "PRESENTE");
        int absentCount = countByStatus(items, "AUSENTE");
        int lateCount = countByStatus(items, "ATRASADO");
        int totalStudents = items.size();
        int suspendedCount = countByStatus(items, "SUSPENDIDO");
        int totalAbsences = absentCount + suspendedCount;
        int markedCount = registerState.classSuspended() ? 0 : presentCount + totalAbsences + lateCount;

        return new DailyAttendanceView(
                course.id(),
                course.name(),
                targetDate.toString(),
                registerState.classSuspended(),
                registerState.classSuspended() ? resolveSuspensionMessage(registerState.suspensionReason()) : null,
                totalStudents,
                registerState.classSuspended() ? 0 : presentCount,
                registerState.classSuspended() ? 0 : totalAbsences,
                registerState.classSuspended() ? 0 : lateCount,
                new DailyAttendanceSummary(
                        markedCount,
                        registerState.classSuspended() ? 0 : percentage(markedCount, totalStudents),
                        registerState.classSuspended() ? 0 : percentage(presentCount, totalStudents),
                        registerState.classSuspended() ? 0 : percentage(totalAbsences, totalStudents),
                        registerState.classSuspended() ? 0 : percentage(lateCount, totalStudents)
                ),
                items
        );
    }

    @Override
    public DailyAttendanceView saveDailyAttendance(Long courseId, LocalDate date, boolean classSuspended, String suspensionReason, List<DailyAttendanceCommand> commands) {
        AttendanceCourseOption course = findCourse(courseId);
        LocalDate targetDate = normalizeDate(date);
        List<AttendanceStudentInfo> students = manageAttendancePort.findActiveStudentsByCourse(courseId);
        Set<Long> validStudentIds = students.stream()
                .map(AttendanceStudentInfo::studentId)
                .collect(java.util.stream.Collectors.toSet());

        List<DailyAttendanceCommand> sanitizedCommands = commands.stream()
                .filter(command -> command.studentId() != null && validStudentIds.contains(command.studentId()))
                .map(this::sanitizeCommand)
                .toList();

        manageAttendancePort.saveDailyAttendance(
                course.id(),
                targetDate,
                classSuspended,
                sanitizeSuspensionReason(suspensionReason),
                sanitizedCommands
        );
        return getDailyAttendance(course.id(), targetDate);
    }

    @Override
    public WeeklyAttendanceView getWeeklyAttendance(Long courseId, LocalDate weekStart) {
        AttendanceCourseOption course = findCourse(courseId);
        LocalDate monday = normalizeWeekStart(weekStart);
        LocalDate friday = monday.plusDays(4);
        List<AttendanceStudentInfo> students = manageAttendancePort.findActiveStudentsByCourse(courseId);
        List<AttendanceRecordEntry> weekEntries = manageAttendancePort.findAttendanceEntriesByCourseAndPeriod(courseId, monday, friday);
        Set<LocalDate> suspendedDates = manageAttendancePort.findSuspendedClassDatesByCourseAndPeriod(courseId, monday, friday);
        Map<Long, Map<LocalDate, AttendanceRecordEntry>> indexed = indexByStudentAndDate(weekEntries);
        List<String> dates = buildWeekDates(monday);
        List<WeeklyAttendanceStudent> summaries = new ArrayList<>();
        List<AttendanceAlert> alerts = new ArrayList<>();

        for (AttendanceStudentInfo student : students) {
            Map<LocalDate, AttendanceRecordEntry> byDate = indexed.getOrDefault(student.studentId(), Map.of());
            List<WeeklyAttendanceDay> days = new ArrayList<>();
            int presents = 0;
            int absences = 0;
            int lateCount = 0;

            for (int offset = 0; offset < 5; offset++) {
                LocalDate current = monday.plusDays(offset);
                if (suspendedDates.contains(current)) {
                    days.add(new WeeklyAttendanceDay(current.toString(), "CLASES_SUSPENDIDAS"));
                    continue;
                }
                AttendanceRecordEntry entry = byDate.get(current);
                String status = normalizeStatus(entry == null ? "SIN_MARCAR" : entry.status());
                if ("PRESENTE".equals(status)) {
                    presents++;
                } else if ("ATRASADO".equals(status)) {
                    lateCount++;
                } else if ("AUSENTE".equals(status) || "SUSPENDIDO".equals(status)) {
                    absences++;
                }
                days.add(new WeeklyAttendanceDay(current.toString(), status));
            }

            int weeklyTrackedDays = Math.max(0, 5 - suspendedDates.size());
            int attendancePercentage = percentage(presents + lateCount, weeklyTrackedDays);
            String badge = resolveWeeklyBadge(absences, lateCount);
            summaries.add(new WeeklyAttendanceStudent(
                    student.studentId(),
                    student.run(),
                    student.fullName(),
                    days,
                    attendancePercentage,
                    badge,
                    absences,
                    lateCount
            ));

            if ("CRITICO".equals(badge)) {
                alerts.add(new AttendanceAlert("CRITICO", student.fullName(), absences + " inasistencias esta semana"));
            } else if ("ATENCION".equals(badge)) {
                alerts.add(new AttendanceAlert("ATENCION", student.fullName(), lateCount >= 2
                        ? lateCount + " atrasos acumulados"
                        : absences + " inasistencia registrada"));
            }
        }

        summaries.sort(Comparator.comparing(WeeklyAttendanceStudent::fullName));

        WeeklyAttendanceSummary summary = new WeeklyAttendanceSummary(
                summaries.isEmpty()
                        ? 0
                        : Math.round((float) summaries.stream()
                                .mapToInt(WeeklyAttendanceStudent::attendancePercentage)
                                .sum() / summaries.size()),
                summaries.stream().mapToInt(WeeklyAttendanceStudent::absences).sum(),
                summaries.stream().mapToInt(WeeklyAttendanceStudent::lateCount).sum(),
                alerts.size()
        );

        return new WeeklyAttendanceView(
                course.id(),
                course.name(),
                buildWeekLabel(monday, friday),
                dates,
                summary,
                summaries,
                alerts
        );
    }

    @Override
    public MonthlyAttendanceView getMonthlyAttendance(Long courseId, YearMonth month) {
        AttendanceCourseOption course = findCourse(courseId);
        YearMonth targetMonth = month == null ? YearMonth.now() : month;
        LocalDate start = targetMonth.atDay(1);
        LocalDate end = targetMonth.atEndOfMonth();
        List<AttendanceStudentInfo> students = manageAttendancePort.findActiveStudentsByCourse(courseId);
        List<AttendanceRecordEntry> monthEntries = manageAttendancePort.findAttendanceEntriesByCourseAndPeriod(courseId, start, end);
        Set<LocalDate> suspendedDates = manageAttendancePort.findSuspendedClassDatesByCourseAndPeriod(courseId, start, end);
        List<AttendanceSpecialActivity> specialActivities = manageAttendancePort.findSpecialActivitiesByCourseAndPeriod(courseId, start, end);
        Map<LocalDate, MonthlyAttendanceSpecialDate> specialDatesByDay = buildSpecialDatesByDay(specialActivities, start, end);
        Set<LocalDate> nonSchoolSpecialDates = specialDatesByDay.keySet();
        Map<Long, List<AttendanceRecordEntry>> entriesByStudent = new HashMap<>();
        for (AttendanceRecordEntry entry : monthEntries) {
            entriesByStudent.computeIfAbsent(entry.studentId(), ignored -> new ArrayList<>()).add(entry);
        }

        int schoolDays = manageAttendancePort.countRecordedSchoolDays(courseId, start, end);
        int recordedEntryDays = (int) monthEntries.stream()
                .map(AttendanceRecordEntry::attendanceDate)
                .filter(recordedDate -> !suspendedDates.contains(recordedDate) && !nonSchoolSpecialDates.contains(recordedDate))
                .distinct()
                .count();
        schoolDays = Math.max(schoolDays, recordedEntryDays);
        if (schoolDays <= 0) {
            schoolDays = countWeekdays(start, end, suspendedDates, nonSchoolSpecialDates);
        }

        List<MonthlyAttendanceStudent> studentSummaries = new ArrayList<>();
        int totalPresenceScore = 0;
        int totalLate = 0;
        int studentsAtRisk = 0;
        int totalPresentCount = 0;
        int totalAbsentCount = 0;
        Map<LocalDate, List<AttendanceRecordEntry>> entriesByDate = new TreeMap<>();

        for (AttendanceRecordEntry entry : monthEntries) {
            entriesByDate.computeIfAbsent(entry.attendanceDate(), ignored -> new ArrayList<>()).add(entry);
        }

        for (AttendanceStudentInfo student : students) {
            List<AttendanceRecordEntry> entries = entriesByStudent.getOrDefault(student.studentId(), List.of());
            int presentCount = (int) entries.stream().filter(entry -> "PRESENTE".equals(normalizeStatus(entry.status()))).count();
            int absentCount = (int) entries.stream()
                    .filter(entry -> {
                        String normalizedStatus = normalizeStatus(entry.status());
                        return "AUSENTE".equals(normalizedStatus) || "SUSPENDIDO".equals(normalizedStatus);
                    })
                    .count();
            int lateCount = (int) entries.stream().filter(entry -> "ATRASADO".equals(normalizeStatus(entry.status()))).count();
            int presentPercentage = percentage(presentCount, schoolDays);
            int absentPercentage = percentage(absentCount, schoolDays);
            int latePercentage = percentage(lateCount, schoolDays);
            String riskStatus = resolveMonthlyRisk(absentCount, lateCount);
            List<MonthlyAttendanceStudentDay> studentDays = entries.stream()
                    .sorted(Comparator.comparing(AttendanceRecordEntry::attendanceDate))
                    .map(entry -> new MonthlyAttendanceStudentDay(
                            entry.attendanceDate().toString(),
                            normalizeStatus(entry.status())
                    ))
                    .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
            for (LocalDate suspendedDate : suspendedDates) {
                boolean alreadyIncluded = studentDays.stream().anyMatch(day -> day.date().equals(suspendedDate.toString()));
                if (!alreadyIncluded) {
                    studentDays.add(new MonthlyAttendanceStudentDay(suspendedDate.toString(), "CLASES_SUSPENDIDAS"));
                }
            }
            studentDays.sort(Comparator.comparing(MonthlyAttendanceStudentDay::date));

            if (!"NORMAL".equals(riskStatus)) {
                studentsAtRisk++;
            }
            totalPresentCount += presentCount;
            totalAbsentCount += absentCount;
            totalLate += lateCount;
            totalPresenceScore += percentage(presentCount + lateCount, schoolDays);

            studentSummaries.add(new MonthlyAttendanceStudent(
                    student.studentId(),
                    student.run(),
                    student.fullName(),
                    presentPercentage,
                    absentPercentage,
                    latePercentage,
                    riskStatus,
                    presentCount,
                    absentCount,
                    lateCount,
                    studentDays
            ));
        }

        studentSummaries.sort(Comparator.comparing(MonthlyAttendanceStudent::fullName));
        int averageAttendance = students.isEmpty() ? 0 : Math.round(totalPresenceScore / (float) students.size());
        int totalTrackedEntries = totalPresentCount + totalAbsentCount + totalLate;
        MonthlyAttendanceDistribution distribution = new MonthlyAttendanceDistribution(
                totalPresentCount,
                percentage(totalPresentCount, totalTrackedEntries),
                totalAbsentCount,
                percentage(totalAbsentCount, totalTrackedEntries),
                totalLate,
                percentage(totalLate, totalTrackedEntries)
        );
        List<MonthlyAttendanceDaySummary> dailySummary = entriesByDate.entrySet().stream()
                .map(entry -> {
                    int presentForDay = (int) entry.getValue().stream()
                            .filter(item -> "PRESENTE".equals(normalizeStatus(item.status())) || "ATRASADO".equals(normalizeStatus(item.status())))
                            .count();
                    int totalForDay = entry.getValue().size();
                    return new MonthlyAttendanceDaySummary(
                            String.valueOf(entry.getKey().getDayOfMonth()),
                            percentage(presentForDay, totalForDay)
                    );
                })
                .toList();

        return new MonthlyAttendanceView(
                course.id(),
                course.name(),
                targetMonth.getMonth().getDisplayName(TextStyle.FULL, CHILE) + " " + targetMonth.getYear(),
                schoolDays,
                averageAttendance,
                studentsAtRisk,
                totalLate,
                distribution,
                dailySummary,
                suspendedDates.stream().sorted().map(LocalDate::toString).toList(),
                specialDatesByDay.values().stream()
                        .sorted(Comparator.comparing(MonthlyAttendanceSpecialDate::date))
                        .toList(),
                studentSummaries
        );
    }

    @Override
    public AttendanceStudentSummary getStudentAttendanceSummary(Long courseId, Long studentId, int schoolYear, int semester) {
        findCourse(courseId);
        LocalDate start = semester == 2
                ? LocalDate.of(schoolYear, 8, 1)
                : LocalDate.of(schoolYear, 3, 1);
        LocalDate end = semester == 2
                ? LocalDate.of(schoolYear, 12, 31)
                : LocalDate.of(schoolYear, 7, 31);
        return manageAttendancePort.findStudentAttendanceSummary(courseId, studentId, start, end);
    }

    private AttendanceCourseOption findCourse(Long courseId) {
        return manageAttendancePort.findAttendanceCourseById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
    }

    private LocalDate normalizeDate(LocalDate date) {
        return date == null ? LocalDate.now() : date;
    }

    private LocalDate normalizeWeekStart(LocalDate date) {
        LocalDate base = normalizeDate(date);
        while (base.getDayOfWeek() != DayOfWeek.MONDAY) {
            base = base.minusDays(1);
        }
        return base;
    }

    private DailyAttendanceItem mapDailyItem(AttendanceStudentInfo student, AttendanceRecordEntry entry) {
        return new DailyAttendanceItem(
                student.studentId(),
                student.run(),
                student.fullName(),
                normalizeStatus(entry == null ? "SIN_MARCAR" : entry.status()),
                entry == null ? null : entry.arrivalTime(),
                entry == null ? null : entry.note()
        );
    }

    private DailyAttendanceCommand sanitizeCommand(DailyAttendanceCommand command) {
        String status = normalizeStatus(command.status());
        String arrivalTime = command.arrivalTime() == null || command.arrivalTime().isBlank() ? null : command.arrivalTime().trim();
        String note = command.note() == null || command.note().isBlank() ? null : command.note().trim();
        if (!"ATRASADO".equals(status)) {
            arrivalTime = null;
        }
        return new DailyAttendanceCommand(command.studentId(), status, arrivalTime, note);
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "SIN_MARCAR";
        }
        return switch (status.trim().toUpperCase(CHILE)) {
            case "ATRASO", "ATRASADO" -> "ATRASADO";
            case "PRESENTE" -> "PRESENTE";
            case "AUSENTE" -> "AUSENTE";
            case "SUSPENDIDO", "SUSPENSION", "SUSPENSIÓN" -> "SUSPENDIDO";
            case "CLASES_SUSPENDIDAS" -> "CLASES_SUSPENDIDAS";
            default -> "SIN_MARCAR";
        };
    }

    private String sanitizeSuspensionReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return "Clases suspendidas";
        }
        return reason.trim();
    }

    private String resolveSuspensionMessage(String reason) {
        return reason == null || reason.isBlank() ? "Clases suspendidas" : reason.trim();
    }

    private int countByStatus(List<DailyAttendanceItem> items, String status) {
        return (int) items.stream().filter(item -> status.equals(item.status())).count();
    }

    private Map<Long, AttendanceRecordEntry> indexByStudent(List<AttendanceRecordEntry> entries) {
        Map<Long, AttendanceRecordEntry> indexed = new HashMap<>();
        for (AttendanceRecordEntry entry : entries) {
            indexed.put(entry.studentId(), entry);
        }
        return indexed;
    }

    private Map<Long, Map<LocalDate, AttendanceRecordEntry>> indexByStudentAndDate(List<AttendanceRecordEntry> entries) {
        Map<Long, Map<LocalDate, AttendanceRecordEntry>> indexed = new HashMap<>();
        for (AttendanceRecordEntry entry : entries) {
            indexed.computeIfAbsent(entry.studentId(), ignored -> new HashMap<>()).put(entry.attendanceDate(), entry);
        }
        return indexed;
    }

    private List<String> buildWeekDates(LocalDate monday) {
        List<String> dates = new ArrayList<>();
        for (int offset = 0; offset < 5; offset++) {
            dates.add(monday.plusDays(offset).toString());
        }
        return dates;
    }

    private String buildWeekLabel(LocalDate start, LocalDate end) {
        return "Semana del " + start.getDayOfMonth() + " " +
                start.getMonth().getDisplayName(TextStyle.SHORT, CHILE) +
                " al " + end.getDayOfMonth() + " " +
                end.getMonth().getDisplayName(TextStyle.SHORT, CHILE) + " " + end.getYear();
    }

    private String resolveWeeklyBadge(int absences, int lateCount) {
        if (absences >= 3) {
            return "CRITICO";
        }
        if (absences >= 1 || lateCount >= 2) {
            return "ATENCION";
        }
        return "NORMAL";
    }

    private String resolveMonthlyRisk(int absences, int lateCount) {
        if (absences >= 3 || lateCount >= 4) {
            return "RIESGO";
        }
        if (absences >= 1 || lateCount >= 2) {
            return "ATENCION";
        }
        return "NORMAL";
    }

    private int percentage(int value, int total) {
        if (total <= 0) {
            return 0;
        }
        return Math.round((value * 100f) / total);
    }

    private Map<LocalDate, MonthlyAttendanceSpecialDate> buildSpecialDatesByDay(
            List<AttendanceSpecialActivity> specialActivities,
            LocalDate start,
            LocalDate end
    ) {
        Map<LocalDate, MonthlyAttendanceSpecialDate> specialDates = new TreeMap<>();
        for (AttendanceSpecialActivity activity : specialActivities) {
            LocalDate current = activity.startDate().isBefore(start) ? start : activity.startDate();
            LocalDate last = activity.endDate().isAfter(end) ? end : activity.endDate();
            while (!current.isAfter(last)) {
                MonthlyAttendanceSpecialDate candidate = new MonthlyAttendanceSpecialDate(
                        current.toString(),
                        normalizeSpecialType(activity.typeCode()),
                        activity.title()
                );
                MonthlyAttendanceSpecialDate existing = specialDates.get(current);
                if (existing == null || specialTypePriority(candidate.type()) >= specialTypePriority(existing.type())) {
                    specialDates.put(current, candidate);
                }
                current = current.plusDays(1);
            }
        }
        return specialDates;
    }

    private String normalizeSpecialType(String typeCode) {
        if (typeCode == null || typeCode.isBlank()) {
            return "SUSPENSION";
        }
        return switch (typeCode.trim().toUpperCase(CHILE)) {
            case "VACACIONES" -> "VACACIONES";
            case "FERIADO" -> "FERIADO";
            case "INTERFERIADO" -> "INTERFERIADO";
            default -> "SUSPENSION";
        };
    }

    private int specialTypePriority(String type) {
        return switch (type) {
            case "SUSPENSION" -> 3;
            case "FERIADO", "INTERFERIADO" -> 2;
            case "VACACIONES" -> 1;
            default -> 0;
        };
    }

    private int countWeekdays(LocalDate start, LocalDate end, Set<LocalDate> suspendedDates, Set<LocalDate> specialDates) {
        int days = 0;
        LocalDate current = start;
        while (!current.isAfter(end)) {
            if (current.getDayOfWeek() != DayOfWeek.SATURDAY
                    && current.getDayOfWeek() != DayOfWeek.SUNDAY
                    && !suspendedDates.contains(current)
                    && !specialDates.contains(current)) {
                days++;
            }
            current = current.plusDays(1);
        }
        return days;
    }
}
