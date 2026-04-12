package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningClass;
import com.example.authhexagonal.domain.model.PlanningClassCommand;

public interface CreatePlanningClassUseCase {

    PlanningClass createClass(String username, PlanningClassCommand command);
}
