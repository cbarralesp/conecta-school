package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.PlanningUnitCatalogAssignment;

import java.util.List;
import java.util.Optional;

public interface PlanningCatalogRepositoryPort {

    List<PlanningUnitCatalogAssignment> findAvailableAssignments(String username);

    Optional<Long> findUserIdByUsername(String username);
}
