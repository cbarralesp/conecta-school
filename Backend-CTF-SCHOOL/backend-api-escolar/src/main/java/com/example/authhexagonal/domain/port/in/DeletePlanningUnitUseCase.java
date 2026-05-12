package com.example.authhexagonal.domain.port.in;

public interface DeletePlanningUnitUseCase {

    void deleteUnit(String username, Long unitId);
}
