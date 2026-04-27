package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningClass;
import com.example.authhexagonal.domain.model.PlanningClassCommand;

public interface UpdatePlanningClassUseCase {

    PlanningClass updateClass(String username, Long classId, PlanningClassCommand command);
}
