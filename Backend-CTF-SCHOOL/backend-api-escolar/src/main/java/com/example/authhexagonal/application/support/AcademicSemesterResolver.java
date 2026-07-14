package com.example.authhexagonal.application.support;

import java.time.LocalDate;

public final class AcademicSemesterResolver {

    private AcademicSemesterResolver() {
    }

    public static int resolveCurrentSemester() {
        return resolveCurrentSemester(LocalDate.now());
    }

    public static int resolveCurrentSemester(LocalDate date) {
        return date.getMonthValue() >= 7 ? 2 : 1;
    }

    public static int resolveProvidedOrCurrent(Integer semester) {
        return semester == null ? resolveCurrentSemester() : semester;
    }
}
