package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningClass;

public interface UpdatePlanningClassTitleUseCase {

    PlanningClass updateTitle(String username, Long classId, String title);
}
