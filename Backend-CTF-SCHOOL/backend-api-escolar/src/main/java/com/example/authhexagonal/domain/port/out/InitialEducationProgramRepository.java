package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.InitialEducationProgramDetail;

import java.util.Optional;

public interface InitialEducationProgramRepository {

    Optional<InitialEducationProgramDetail> findProgram(
            String grade,
            String visibleSubject,
            String ambit,
            String nucleus
    );
}
