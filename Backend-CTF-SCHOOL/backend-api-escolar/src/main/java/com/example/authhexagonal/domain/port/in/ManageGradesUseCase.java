package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.GradeBookView;
import com.example.authhexagonal.domain.model.GradeCatalog;
import com.example.authhexagonal.domain.model.GradeSaveCommand;
import com.example.authhexagonal.domain.model.GradeReportView;
import com.example.authhexagonal.domain.model.StudentGradeProfileView;

import java.util.List;

public interface ManageGradesUseCase {

    GradeCatalog getCatalog();

    GradeBookView getGradeBook(Long courseId, Long periodId, Long subjectId);

    GradeBookView saveGradeBook(Long courseId, Long periodId, Long subjectId, List<GradeSaveCommand> commands);

    StudentGradeProfileView getStudentProfile(Long courseId, Long periodId);

    GradeReportView getGradeReports(Long courseId, Long periodId);
}
