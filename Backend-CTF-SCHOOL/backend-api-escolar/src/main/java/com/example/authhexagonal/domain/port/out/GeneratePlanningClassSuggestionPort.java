package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.PlanningClassSuggestion;
import com.example.authhexagonal.domain.model.PlanningClassSuggestionCommand;

import java.util.Optional;

public interface GeneratePlanningClassSuggestionPort {

    Optional<PlanningClassSuggestion> generateSuggestion(PlanningClassSuggestionCommand command);
}
