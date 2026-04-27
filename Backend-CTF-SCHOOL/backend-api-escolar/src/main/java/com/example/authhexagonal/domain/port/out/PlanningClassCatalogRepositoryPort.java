package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.PlanningClassCatalogUnit;
import com.example.authhexagonal.domain.model.PlanningObjectiveOption;

import java.util.List;
import java.util.Optional;

public interface PlanningClassCatalogRepositoryPort {

    List<PlanningClassCatalogUnit> findUnits(String username);

    List<PlanningObjectiveOption> findObjectives(String username);

    Optional<PlanningClassCatalogUnit> findAccessibleUnitById(String username, Long unitId);
}
