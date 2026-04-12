package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningSummary;
import com.example.authhexagonal.domain.model.PlanningSummaryFilter;

public interface GetPlanningSummaryUseCase {

    PlanningSummary getSummary(String username, PlanningSummaryFilter filter);
}
