package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.GradeBookView;
import com.example.authhexagonal.domain.model.GradeCatalog;
import com.example.authhexagonal.domain.model.GradeEvaluationCommand;
import com.example.authhexagonal.domain.model.GradeSaveCommand;
import com.example.authhexagonal.domain.model.GradeReportView;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankArea;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankCreateCommand;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankQuestion;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankUpdateCommand;
import com.example.authhexagonal.domain.model.PedagogicalReportSaveCommand;
import com.example.authhexagonal.domain.model.PedagogicalReportView;
import com.example.authhexagonal.domain.model.StudentGradeProfileView;

import java.util.List;

public interface ManageGradesUseCase {

    GradeCatalog getCatalog();

    GradeBookView getGradeBook(Long courseId, Long periodId, Long subjectId);

    GradeBookView saveGradeBook(Long courseId, Long periodId, Long subjectId, List<GradeSaveCommand> commands);

    GradeBookView createEvaluation(GradeEvaluationCommand command);

    GradeBookView updateEvaluation(Long evaluationId, GradeEvaluationCommand command);

    GradeBookView deleteEvaluation(Long evaluationId, Long courseId, Long periodId, Long subjectId);

    StudentGradeProfileView getStudentProfile(Long courseId, Long periodId);

    GradeReportView getGradeReports(Long courseId, Long periodId);

    List<PedagogicalQuestionBankArea> getPedagogicalQuestionBank(String levelCode);

    PedagogicalQuestionBankQuestion createPedagogicalQuestionBankQuestion(PedagogicalQuestionBankCreateCommand command);

    PedagogicalQuestionBankQuestion updatePedagogicalQuestionBankQuestion(PedagogicalQuestionBankUpdateCommand command);

    void deletePedagogicalQuestionBankQuestion(Long questionId);

    PedagogicalReportView getPedagogicalReport(Long courseId, Long periodId, Long studentId);

    PedagogicalReportView savePedagogicalReport(PedagogicalReportSaveCommand command);
}
