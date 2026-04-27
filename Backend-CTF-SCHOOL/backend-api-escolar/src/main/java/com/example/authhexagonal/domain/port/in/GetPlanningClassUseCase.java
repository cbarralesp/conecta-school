package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningClass;

public interface GetPlanningClassUseCase {

    PlanningClass getClass(String username, Long classId);
}
