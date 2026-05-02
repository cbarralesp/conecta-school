package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.CurriculumGrade;
import com.example.authhexagonal.domain.model.CurriculumObjective;
import com.example.authhexagonal.domain.model.CurriculumSubject;

import java.util.List;
import java.util.UUID;

public interface GetCurriculumUseCase {

    List<CurriculumSubject> getAllSubjects();

    List<CurriculumGrade> getGradesBySubject(UUID subjectId);

    List<CurriculumObjective> getObjectivesByGrade(UUID gradeId);

    List<CurriculumObjective> searchObjectives(UUID subjectId, String grado, String eje, String tipo);

    List<CurriculumObjective> getObjectivesByContext(String subjectName, String courseName);
}
