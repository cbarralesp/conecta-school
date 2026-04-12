package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningUnitSummary;

import java.util.List;

public interface GetPlanningUnitsUseCase {

    List<PlanningUnitSummary> findUnits(String username);
}
