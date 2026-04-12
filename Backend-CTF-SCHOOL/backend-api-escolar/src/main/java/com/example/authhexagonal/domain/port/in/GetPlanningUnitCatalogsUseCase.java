package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningUnitCatalogs;

public interface GetPlanningUnitCatalogsUseCase {

    PlanningUnitCatalogs getCatalogs(String username);
}
