package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.GradeBookView;
import com.example.authhexagonal.domain.model.GradeCatalog;
import com.example.authhexagonal.domain.model.GradeEvaluationCommand;
import com.example.authhexagonal.domain.model.GradeReportView;
import com.example.authhexagonal.domain.model.GradeSaveCommand;
import com.example.authhexagonal.domain.model.StudentGradeProfileView;
import com.example.authhexagonal.domain.port.in.ManageGradesUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.GradeEvaluationRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.SaveGradeBookRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/calificaciones")
public class GradesController {

    private final ManageGradesUseCase manageGradesUseCase;

    public GradesController(ManageGradesUseCase manageGradesUseCase) {
        this.manageGradesUseCase = manageGradesUseCase;
    }

    @GetMapping("/catalogo")
    public GradeCatalog catalog() {
        return manageGradesUseCase.getCatalog();
    }

    @GetMapping("/libro")
    public GradeBookView gradeBook(
            @RequestParam Long courseId,
            @RequestParam Long periodId,
            @RequestParam(required = false) Long subjectId
    ) {
        return manageGradesUseCase.getGradeBook(courseId, periodId, subjectId);
    }

    @PutMapping("/libro")
    public GradeBookView saveGradeBook(@Valid @RequestBody SaveGradeBookRequest request) {
        List<GradeSaveCommand> commands = request.entries() == null
                ? List.of()
                : request.entries().stream()
                .map(entry -> new GradeSaveCommand(entry.studentId(), entry.evaluationId(), entry.score()))
                .toList();

        return manageGradesUseCase.saveGradeBook(
                request.courseId(),
                request.periodId(),
                request.subjectId(),
                commands
        );
    }

    @PostMapping("/evaluaciones")
    public GradeBookView createEvaluation(@Valid @RequestBody GradeEvaluationRequest request) {
        return manageGradesUseCase.createEvaluation(toCommand(request));
    }

    @PutMapping("/evaluaciones/{evaluationId}")
    public GradeBookView updateEvaluation(
            @PathVariable Long evaluationId,
            @Valid @RequestBody GradeEvaluationRequest request
    ) {
        return manageGradesUseCase.updateEvaluation(evaluationId, toCommand(request));
    }

    @DeleteMapping("/evaluaciones/{evaluationId}")
    public GradeBookView deleteEvaluation(
            @PathVariable Long evaluationId,
            @RequestParam Long courseId,
            @RequestParam Long periodId,
            @RequestParam Long subjectId
    ) {
        return manageGradesUseCase.deleteEvaluation(evaluationId, courseId, periodId, subjectId);
    }

    @GetMapping("/ficha")
    public StudentGradeProfileView studentProfile(@RequestParam Long courseId, @RequestParam Long periodId) {
        return manageGradesUseCase.getStudentProfile(courseId, periodId);
    }

    @GetMapping("/informes")
    public GradeReportView reports(@RequestParam Long courseId, @RequestParam Long periodId) {
        return manageGradesUseCase.getGradeReports(courseId, periodId);
    }

    private GradeEvaluationCommand toCommand(GradeEvaluationRequest request) {
        return new GradeEvaluationCommand(
                request.courseId(),
                request.periodId(),
                request.subjectId(),
                request.code(),
                request.name(),
                request.weight(),
                request.evaluationDate()
        );
    }
}
