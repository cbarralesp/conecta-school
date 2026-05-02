package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.GetCurriculumUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.CurriculumGradeResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.CurriculumObjectiveResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.CurriculumSubjectResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/curriculum")
public class CurriculumController {

    private final GetCurriculumUseCase getCurriculumUseCase;

    public CurriculumController(GetCurriculumUseCase getCurriculumUseCase) {
        this.getCurriculumUseCase = getCurriculumUseCase;
    }

    @GetMapping("/subjects")
    public List<CurriculumSubjectResponse> getSubjects() {
        return getCurriculumUseCase.getAllSubjects().stream()
                .map(CurriculumSubjectResponse::fromDomain)
                .toList();
    }

    @GetMapping("/subjects/{subjectId}/grades")
    public List<CurriculumGradeResponse> getGradesBySubject(@PathVariable UUID subjectId) {
        return getCurriculumUseCase.getGradesBySubject(subjectId).stream()
                .map(CurriculumGradeResponse::fromDomain)
                .toList();
    }

    @GetMapping("/grades/{gradeId}/objectives")
    public List<CurriculumObjectiveResponse> getObjectivesByGrade(@PathVariable UUID gradeId) {
        return getCurriculumUseCase.getObjectivesByGrade(gradeId).stream()
                .map(CurriculumObjectiveResponse::fromDomain)
                .toList();
    }

    @GetMapping("/objectives/search")
    public List<CurriculumObjectiveResponse> searchObjectives(
            @RequestParam(name = "subjectId", required = false) UUID subjectId,
            @RequestParam(name = "grado", required = false) String grado,
            @RequestParam(name = "eje", required = false) String eje,
            @RequestParam(name = "tipo", required = false) String tipo
    ) {
        return getCurriculumUseCase.searchObjectives(subjectId, grado, eje, tipo).stream()
                .map(CurriculumObjectiveResponse::fromDomain)
                .toList();
    }

    @GetMapping("/objectives/context")
    public List<CurriculumObjectiveResponse> getObjectivesByContext(
            @RequestParam(name = "subjectName") String subjectName,
            @RequestParam(name = "courseName") String courseName
    ) {
        return getCurriculumUseCase.getObjectivesByContext(subjectName, courseName).stream()
                .map(CurriculumObjectiveResponse::fromDomain)
                .toList();
    }
}
