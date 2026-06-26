package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.PlanningUnit;
import com.example.authhexagonal.domain.model.PlanningUnitStatus;
import com.example.authhexagonal.domain.model.PlanningUnitSummary;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PlanningUnitRepositoryPort {

    PlanningUnit createUnit(
            Long loadId,
            String unitNumber,
            String name,
            Integer startWeek,
            LocalDate startDate,
            LocalDate endDate,
            int estimatedWeeks,
            int plannedClasses,
            String generalDescription,
            String learningObjectives,
            String achievementIndicators,
            PlanningUnitStatus status,
            Long createdByUserId
    );

    PlanningUnit updateUnit(
            Long unitId,
            String unitNumber,
            String name
    );

    PlanningUnit updateUnitDetails(
            Long unitId,
            String unitNumber,
            String name,
            Integer startWeek,
            LocalDate startDate,
            LocalDate endDate,
            int estimatedWeeks,
            int plannedClasses,
            String generalDescription,
            String learningObjectives,
            String achievementIndicators
    );

    boolean hasClasses(Long unitId);

    void deleteUnit(Long unitId);

    List<PlanningUnitSummary> findUnitsByUsername(String username);

    Optional<PlanningUnit> findById(Long unitId);

    Optional<PlanningUnit> findAccessibleById(String username, Long unitId);
}
