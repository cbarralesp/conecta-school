package com.example.authhexagonal.domain.model;

import java.util.List;

public final class PlanningClassDurationOption {

    private PlanningClassDurationOption() {
    }

    public static List<PlanningOptionItem> defaults() {
        return List.of(
                new PlanningOptionItem("UN_BLOQUE", "1 bloque"),
                new PlanningOptionItem("DOS_BLOQUES", "2 bloques"),
                new PlanningOptionItem("UNA_SEMANA", "1 semana"),
                new PlanningOptionItem("DOS_SEMANAS", "2 semanas"),
                new PlanningOptionItem("CUATRO_SEMANAS", "4 semanas")
        );
    }
}
