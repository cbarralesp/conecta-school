package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningUnit;
import com.example.authhexagonal.domain.model.PlanningUnitCommand;

public interface CreatePlanningUnitUseCase {

    PlanningUnit createUnit(String username, PlanningUnitCommand command);
}
