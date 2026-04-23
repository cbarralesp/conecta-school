package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningUnit;

public interface UpdatePlanningUnitUseCase {

    PlanningUnit updateUnit(String username, Long unitId, String unitNumber, String name);
}
