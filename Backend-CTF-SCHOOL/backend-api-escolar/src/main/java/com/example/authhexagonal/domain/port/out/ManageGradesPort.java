package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.GradeCourseOption;
import com.example.authhexagonal.domain.model.GradeEvaluationCommand;
import com.example.authhexagonal.domain.model.GradeEvaluationHeader;
import com.example.authhexagonal.domain.model.GradePeriodOption;
import com.example.authhexagonal.domain.model.GradeScoreEntry;
import com.example.authhexagonal.domain.model.GradeStudentInfo;
import com.example.authhexagonal.domain.model.GradeSubjectTab;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankRow;
import com.example.authhexagonal.domain.model.GradeSaveCommand;
import com.example.authhexagonal.domain.model.StudentSubjectAverage;

import java.util.List;
import java.util.Optional;

public interface ManageGradesPort {

    List<GradeCourseOption> findCoursesWithGrades();

    Optional<GradeCourseOption> findCourseById(Long courseId);

    List<GradePeriodOption> findActivePeriods();

    Optional<GradePeriodOption> findPeriodById(Long periodId);

    List<GradeSubjectTab> findSubjectsByCourseAndPeriod(Long courseId, Long periodId);

    List<GradeEvaluationHeader> findEvaluations(Long courseId, Long periodId, Long subjectId);

    List<GradeStudentInfo> findStudentsByCourse(Long courseId);

    List<GradeScoreEntry> findScores(Long courseId, Long periodId, Long subjectId);

    void saveScores(List<GradeSaveCommand> commands);

    void createEvaluation(GradeEvaluationCommand command, int order);

    boolean updateEvaluation(Long evaluationId, GradeEvaluationCommand command);

    boolean deactivateEvaluation(Long evaluationId, Long courseId, Long periodId, Long subjectId);

    List<StudentSubjectAverageRow> findStudentSubjectAverages(Long courseId, Long periodId);

    List<PedagogicalQuestionBankRow> findPedagogicalQuestionBank(String levelCode);

    Optional<String> findPedagogicalReportContent(Long courseId, Long periodId, Long studentId);

    void savePedagogicalReportContent(Long courseId, Long periodId, Long studentId, String contentJson);

    record StudentSubjectAverageRow(
            Long studentId,
            String run,
            String fullName,
            Long subjectId,
            String subjectName,
            String colorHex,
            Double average,
            String evaluationType,
            String conceptSummaryCode
    ) {
    }
}
