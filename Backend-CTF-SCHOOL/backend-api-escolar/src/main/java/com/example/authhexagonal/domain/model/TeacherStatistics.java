package com.example.authhexagonal.domain.model;

import java.util.List;

public record TeacherStatistics(
        String periodLabel,
        List<String> chartLabels,
        List<Level> levels
) {
    public record Level(
            String id,
            List<Course> courses
    ) {
    }

    public record Course(
            Long id,
            String name,
            int students,
            String teacher,
            int averageAttendance,
            double averageGrade,
            int planningProgress,
            int annotations,
            int annotationDelta,
            int attendanceDelta,
            double gradeDelta,
            int planningDelta,
            List<DistributionItem> attendanceBreakdown,
            List<Integer> attendanceSeries,
            List<Double> gradeSeries,
            List<Integer> planningSeries,
            PlanningSummary planningSummary,
            List<Integer> annotationSeries,
            int evaluationsCount,
            int publishedActivitiesCount,
            int sharedResourcesCount,
            int standoutStudentsCount
    ) {
    }

    public record DistributionItem(
            String label,
            int value,
            String tone
    ) {
    }

    public record PlanningSummary(
            int completed,
            int inProgress,
            int pending
    ) {
    }
}
