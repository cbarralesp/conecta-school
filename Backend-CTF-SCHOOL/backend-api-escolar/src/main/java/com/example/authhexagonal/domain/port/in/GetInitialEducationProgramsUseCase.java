package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.InitialEducationProgramDetail;

public interface GetInitialEducationProgramsUseCase {

    InitialEducationProgramDetail findProgram(
            String grade,
            String visibleSubject,
            String ambit,
            String nucleus
    );
}
