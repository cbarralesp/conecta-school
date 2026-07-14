package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.GradeBookView;
import com.example.authhexagonal.domain.model.GradeCatalog;
import com.example.authhexagonal.domain.model.GradeEvaluationCommand;
import com.example.authhexagonal.domain.model.GradeReportView;
import com.example.authhexagonal.domain.model.GradeSaveCommand;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankArea;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankCreateCommand;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankQuestion;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankUpdateCommand;
import com.example.authhexagonal.domain.model.PedagogicalReportArea;
import com.example.authhexagonal.domain.model.PedagogicalReportContent;
import com.example.authhexagonal.domain.model.PedagogicalReportItem;
import com.example.authhexagonal.domain.model.PedagogicalReportSaveCommand;
import com.example.authhexagonal.domain.model.PedagogicalReportView;
import com.example.authhexagonal.domain.model.StudentGradeProfileView;
import com.example.authhexagonal.domain.port.in.ManageGradesUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.GradeEvaluationRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PedagogicalQuestionBankCreateRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PedagogicalQuestionBankUpdateRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PedagogicalReportAreaRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PedagogicalReportContentRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PedagogicalReportSaveRequest;
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
@RequestMapping({"/api/calificaciones", "/api/calificaciónes"})
public class GradesController {

    private final ManageGradesUseCase manageGradesUseCase;

    public GradesController(ManageGradesUseCase manageGradesUseCase) {
        this.manageGradesUseCase = manageGradesUseCase;
    }

    @GetMapping({"/catalogo", "/catálogo"})
    public GradeCatalog catalog() {
        return manageGradesUseCase.getCatalog();
    }

    @GetMapping("/libro")
    public GradeBookView gradeBook(
            @RequestParam(name = "courseId") Long courseId,
            @RequestParam(name = "periodId") Long periodId,
            @RequestParam(name = "subjectId", required = false) Long subjectId
    ) {
        return manageGradesUseCase.getGradeBook(courseId, periodId, subjectId);
    }

    @PutMapping("/libro")
    public GradeBookView saveGradeBook(@Valid @RequestBody SaveGradeBookRequest request) {
        List<GradeSaveCommand> commands = request.entries() == null
                ? List.of()
                : request.entries().stream()
                .map(entry -> new GradeSaveCommand(entry.studentId(), entry.evaluationId(), entry.score(), entry.conceptCode(), entry.percentage()))
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
            @PathVariable("evaluationId") Long evaluationId,
            @Valid @RequestBody GradeEvaluationRequest request
    ) {
        return manageGradesUseCase.updateEvaluation(evaluationId, toCommand(request));
    }

    @DeleteMapping("/evaluaciones/{evaluationId}")
    public GradeBookView deleteEvaluation(
            @PathVariable("evaluationId") Long evaluationId,
            @RequestParam(name = "courseId") Long courseId,
            @RequestParam(name = "periodId") Long periodId,
            @RequestParam(name = "subjectId") Long subjectId
    ) {
        return manageGradesUseCase.deleteEvaluation(evaluationId, courseId, periodId, subjectId);
    }

    @GetMapping("/ficha")
    public StudentGradeProfileView studentProfile(
            @RequestParam(name = "courseId") Long courseId,
            @RequestParam(name = "periodId") Long periodId
    ) {
        return manageGradesUseCase.getStudentProfile(courseId, periodId);
    }

    @GetMapping("/informes")
    public GradeReportView reports(
            @RequestParam(name = "courseId") Long courseId,
            @RequestParam(name = "periodId") Long periodId
    ) {
        return manageGradesUseCase.getGradeReports(courseId, periodId);
    }

    @GetMapping("/informes-pedagogicos/banco")
    public List<PedagogicalQuestionBankArea> pedagogicalQuestionBank(
            @RequestParam(name = "levelCode", required = false) String levelCode
    ) {
        return manageGradesUseCase.getPedagogicalQuestionBank(levelCode);
    }

    @PostMapping("/informes-pedagogicos/banco")
    public PedagogicalQuestionBankQuestion createPedagogicalQuestion(
            @Valid @RequestBody PedagogicalQuestionBankCreateRequest request
    ) {
        return manageGradesUseCase.createPedagogicalQuestionBankQuestion(new PedagogicalQuestionBankCreateCommand(
                request.areaKey(),
                request.levelCode(),
                request.questionKind(),
                request.questionText()
        ));
    }

    @PutMapping("/informes-pedagogicos/banco/{questionId}")
    public PedagogicalQuestionBankQuestion updatePedagogicalQuestion(
            @PathVariable("questionId") Long questionId,
            @Valid @RequestBody PedagogicalQuestionBankUpdateRequest request
    ) {
        return manageGradesUseCase.updatePedagogicalQuestionBankQuestion(new PedagogicalQuestionBankUpdateCommand(
                questionId,
                request.questionText()
        ));
    }

    @DeleteMapping("/informes-pedagogicos/banco/{questionId}")
    public void deletePedagogicalQuestion(@PathVariable("questionId") Long questionId) {
        manageGradesUseCase.deletePedagogicalQuestionBankQuestion(questionId);
    }

    @GetMapping("/informes-pedagogicos")
    public PedagogicalReportView pedagogicalReport(
            @RequestParam(name = "courseId") Long courseId,
            @RequestParam(name = "periodId") Long periodId,
            @RequestParam(name = "studentId") Long studentId
    ) {
        return manageGradesUseCase.getPedagogicalReport(courseId, periodId, studentId);
    }

    @PutMapping("/informes-pedagogicos")
    public PedagogicalReportView savePedagogicalReport(@Valid @RequestBody PedagogicalReportSaveRequest request) {
        return manageGradesUseCase.savePedagogicalReport(new PedagogicalReportSaveCommand(
                request.courseId(),
                request.periodId(),
                request.studentId(),
                toPedagogicalContent(request.content())
        ));
    }

    private GradeEvaluationCommand toCommand(GradeEvaluationRequest request) {
        return new GradeEvaluationCommand(
                request.courseId(),
                request.periodId(),
                request.subjectId(),
                request.code(),
                request.name(),
                request.weight(),
                request.evaluationDate(),
                request.registrationType()
        );
    }

    private PedagogicalReportContent toPedagogicalContent(PedagogicalReportContentRequest request) {
        return new PedagogicalReportContent(
                request.documentTitle(),
                request.educatorName(),
                request.developmentAreas() == null
                        ? List.of()
                        : request.developmentAreas().stream().map(this::toPedagogicalArea).toList(),
                request.attitudeArea() == null ? null : toPedagogicalArea(request.attitudeArea()),
                request.familyRecommendations() == null ? List.of() : request.familyRecommendations(),
                request.teacherSignatureName(),
                request.guardianSignatureLabel()
        );
    }

    private PedagogicalReportArea toPedagogicalArea(PedagogicalReportAreaRequest request) {
        return new PedagogicalReportArea(
                request.key(),
                request.title(),
                request.icon(),
                request.accentColor(),
                request.iconColor(),
                request.items() == null
                        ? List.of()
                        : request.items().stream()
                        .map(item -> new PedagogicalReportItem(item.questionId(), item.label(), item.answer(), null))
                        .toList(),
                request.observation()
        );
    }
}
