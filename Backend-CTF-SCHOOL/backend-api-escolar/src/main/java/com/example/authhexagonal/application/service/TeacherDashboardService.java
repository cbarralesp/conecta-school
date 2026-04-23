package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.TeacherDashboard;
import com.example.authhexagonal.domain.model.TeacherScheduleItem;
import com.example.authhexagonal.domain.port.in.GetTeacherDashboardUseCase;
import com.example.authhexagonal.domain.port.out.LoadTeacherDashboardPort;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;

@Service
public class TeacherDashboardService implements GetTeacherDashboardUseCase {

    private final LoadTeacherDashboardPort loadTeacherDashboardPort;

    public TeacherDashboardService(LoadTeacherDashboardPort loadTeacherDashboardPort) {
        this.loadTeacherDashboardPort = loadTeacherDashboardPort;
    }

    @Override
    public TeacherDashboard getDashboard(String username) {
        TeacherDashboard dashboard = loadTeacherDashboardPort.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Teacher dashboard not found"));

        return new TeacherDashboard(
                dashboard.teacherCode(),
                dashboard.teacherName(),
                dashboard.specialty(),
                dashboard.assignedCoursesCount(),
                dashboard.plannedClassesCount(),
                dashboard.pendingPlanningCount(),
                dashboard.assignedCourses(),
                dashboard.weeklySchedule(),
                resolveTodaySchedulePreview(dashboard.weeklySchedule()),
                dashboard.planningItems()
        );
    }

    private List<TeacherScheduleItem> resolveTodaySchedulePreview(List<TeacherScheduleItem> weeklySchedule) {
        String todayName = resolveTodayName();
        List<TeacherScheduleItem> items = weeklySchedule.stream()
                .filter(item -> todayName.equalsIgnoreCase(item.dayOfWeek()))
                .sorted(Comparator.comparing(TeacherScheduleItem::startTime))
                .toList();

        if (items.size() <= 2) {
            return items;
        }

        LocalTime now = LocalTime.now();
        List<TeacherScheduleItem> upcoming = items.stream()
                .filter(item -> !LocalTime.parse(item.endTime()).isBefore(now))
                .toList();

        if (upcoming.size() >= 2) {
            return upcoming.stream().limit(2).toList();
        }

        if (upcoming.size() == 1) {
            List<TeacherScheduleItem> previous = items.stream()
                    .filter(item -> LocalTime.parse(item.endTime()).isBefore(now))
                    .toList();
            if (!previous.isEmpty()) {
                return List.of(previous.get(previous.size() - 1), upcoming.getFirst());
            }
            return upcoming;
        }

        return items.subList(Math.max(items.size() - 2, 0), items.size());
    }

    private String resolveTodayName() {
        return switch (DayOfWeek.from(LocalDate.now())) {
            case MONDAY -> "LUNES";
            case TUESDAY -> "MARTES";
            case WEDNESDAY -> "MIERCOLES";
            case THURSDAY -> "JUEVES";
            case FRIDAY -> "VIERNES";
            default -> "LUNES";
        };
    }
}
