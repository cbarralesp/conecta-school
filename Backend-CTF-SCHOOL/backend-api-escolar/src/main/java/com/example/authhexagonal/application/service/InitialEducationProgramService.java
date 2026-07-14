package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.InitialEducationProgramDetail;
import com.example.authhexagonal.domain.port.in.GetInitialEducationProgramsUseCase;
import com.example.authhexagonal.domain.port.out.InitialEducationProgramRepository;
import org.springframework.stereotype.Service;

@Service
public class InitialEducationProgramService implements GetInitialEducationProgramsUseCase {

    private final InitialEducationProgramRepository repository;

    public InitialEducationProgramService(InitialEducationProgramRepository repository) {
        this.repository = repository;
    }

    @Override
    public InitialEducationProgramDetail findProgram(String grade, String visibleSubject, String ambit, String nucleus) {
        return repository.findProgram(grade, visibleSubject, ambit, nucleus)
                .orElseThrow(() -> new IllegalArgumentException("No se encontro programa de educacion inicial para la seleccion actual."));
    }
}
