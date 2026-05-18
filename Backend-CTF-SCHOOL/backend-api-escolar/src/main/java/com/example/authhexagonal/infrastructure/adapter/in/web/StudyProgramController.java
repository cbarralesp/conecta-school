package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.StudyProgramDetail;
import com.example.authhexagonal.domain.model.StudyProgramSummary;
import com.example.authhexagonal.domain.port.in.GetStudyProgramsUseCase;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/study-programs")
public class StudyProgramController {

    private final GetStudyProgramsUseCase getStudyProgramsUseCase;

    public StudyProgramController(GetStudyProgramsUseCase getStudyProgramsUseCase) {
        this.getStudyProgramsUseCase = getStudyProgramsUseCase;
    }

    @GetMapping
    public List<StudyProgramSummary> findPrograms(
            @RequestParam(name = "subjectName", required = false) String subjectName,
            @RequestParam(name = "grade", required = false) String grade,
            @RequestParam(name = "courseName", required = false) String courseName
    ) {
        return getStudyProgramsUseCase.findPrograms(subjectName, grade, courseName);
    }

    @GetMapping("/{programId}")
    public StudyProgramDetail getProgram(@PathVariable("programId") Long programId) {
        return getStudyProgramsUseCase.getProgram(programId);
    }

    @GetMapping("/{programId}/units")
    public List<StudyProgramDetail.Unit> getUnits(@PathVariable("programId") Long programId) {
        return getStudyProgramsUseCase.getUnits(programId);
    }

    @GetMapping("/{programId}/permanent-objectives")
    public List<StudyProgramDetail.ObjectiveDetail> getPermanentObjectives(
            @PathVariable("programId") Long programId
    ) {
        return getStudyProgramsUseCase.getPermanentObjectives(programId);
    }

    @GetMapping("/{programId}/units/{unitNumber}/objectives")
    public List<StudyProgramDetail.ObjectiveDetail> getUnitObjectives(
            @PathVariable("programId") Long programId,
            @PathVariable("unitNumber") Integer unitNumber
    ) {
        return getStudyProgramsUseCase.getUnitObjectives(programId, unitNumber);
    }
}
