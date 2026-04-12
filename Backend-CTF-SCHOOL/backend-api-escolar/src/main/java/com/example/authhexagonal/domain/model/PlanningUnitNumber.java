package com.example.authhexagonal.domain.model;

import java.util.Arrays;
import java.util.List;

public enum PlanningUnitNumber {
    UNIDAD_I("UNIDAD_I", "Unidad I"),
    UNIDAD_II("UNIDAD_II", "Unidad II"),
    UNIDAD_III("UNIDAD_III", "Unidad III"),
    UNIDAD_IV("UNIDAD_IV", "Unidad IV"),
    UNIDAD_V("UNIDAD_V", "Unidad V"),
    UNIDAD_VI("UNIDAD_VI", "Unidad VI"),
    UNIDAD_VII("UNIDAD_VII", "Unidad VII"),
    UNIDAD_VIII("UNIDAD_VIII", "Unidad VIII");

    private final String code;
    private final String label;

    PlanningUnitNumber(String code, String label) {
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
