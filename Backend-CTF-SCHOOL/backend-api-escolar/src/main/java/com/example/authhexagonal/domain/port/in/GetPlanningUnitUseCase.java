package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningUnit;

public interface GetPlanningUnitUseCase {

    PlanningUnit getUnit(String username, Long unitId);
}
