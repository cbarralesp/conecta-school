package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.InitialEducationProgramDetail;
import com.example.authhexagonal.domain.port.in.GetInitialEducationProgramsUseCase;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/initial-education-programs")
public class InitialEducationProgramController {

    private final GetInitialEducationProgramsUseCase useCase;

    public InitialEducationProgramController(GetInitialEducationProgramsUseCase useCase) {
        this.useCase = useCase;
    }

    @GetMapping("/detail")
    public InitialEducationProgramDetail getProgram(
            @RequestParam("grade") String grade,
            @RequestParam("visibleSubject") String visibleSubject,
            @RequestParam("ambit") String ambit,
            @RequestParam("nucleus") String nucleus
    ) {
        return useCase.findProgram(grade, visibleSubject, ambit, nucleus);
    }
}
