package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningClassCatalogs;

public interface GetPlanningClassCatalogsUseCase {

    PlanningClassCatalogs getCatalogs(String username);
}
