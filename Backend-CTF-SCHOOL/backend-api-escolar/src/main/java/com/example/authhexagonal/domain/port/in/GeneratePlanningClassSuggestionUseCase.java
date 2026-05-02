package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningClassSuggestion;
import com.example.authhexagonal.domain.model.PlanningClassSuggestionCommand;

public interface GeneratePlanningClassSuggestionUseCase {

    PlanningClassSuggestion generateSuggestion(String username, PlanningClassSuggestionCommand command);
}
