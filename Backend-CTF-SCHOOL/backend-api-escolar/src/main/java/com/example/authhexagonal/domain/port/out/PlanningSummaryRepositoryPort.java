package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.PlanningSubjectFilter;
import com.example.authhexagonal.domain.model.PlanningSummaryFilter;
import com.example.authhexagonal.domain.model.PlanningSummaryMetrics;
import com.example.authhexagonal.domain.model.PlanningSummaryUnit;

import java.util.List;

public interface PlanningSummaryRepositoryPort {

    PlanningSummaryMetrics findMetrics(String username, PlanningSummaryFilter filter);

    List<PlanningSubjectFilter> findSubjects(String username, PlanningSummaryFilter filter);

    List<PlanningSummaryUnit> findUnits(String username, PlanningSummaryFilter filter);
}
