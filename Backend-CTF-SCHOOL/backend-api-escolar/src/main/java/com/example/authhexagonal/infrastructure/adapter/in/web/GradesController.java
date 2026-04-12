package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.GradeBookView;
import com.example.authhexagonal.domain.model.GradeCatalog;
import com.example.authhexagonal.domain.model.GradeReportView;
import com.example.authhexagonal.domain.model.GradeSaveCommand;
import com.example.authhexagonal.domain.model.StudentGradeProfileView;
import com.example.authhexagonal.domain.port.in.ManageGradesUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.SaveGradeBookRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
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

    @GetMapping("/ficha")
    public StudentGradeProfileView studentProfile(@RequestParam Long courseId, @RequestParam Long periodId) {
        return manageGradesUseCase.getStudentProfile(courseId, periodId);
    }

    @GetMapping("/informes")
    public GradeReportView reports(@RequestParam Long courseId, @RequestParam Long periodId) {
        return manageGradesUseCase.getGradeReports(courseId, periodId);
    }
}
