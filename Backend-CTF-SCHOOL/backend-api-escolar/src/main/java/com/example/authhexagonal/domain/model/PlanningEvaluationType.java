package com.example.authhexagonal.domain.model;

import java.util.Arrays;
import java.util.List;

public enum PlanningEvaluationType {
    FORMATIVA("FORMATIVA", "Formativa"),
    SUMATIVA("SUMATIVA", "Sumativa"),
    DIAGNOSTICA("DIAGNOSTICA", "Diagnostica"),
    SIN_EVALUACION("SIN_EVALUACION", "Sin evaluacion");

    private final String code;
    private final String label;

    PlanningEvaluationType(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public String code() {
        return code;
    }

    public String label() {
        return label;
    }

    public static List<PlanningOptionItem> asOptions() {
        return Arrays.stream(values())
                .map(item -> new PlanningOptionItem(item.code(), item.label()))
                .toList();
    }
}
