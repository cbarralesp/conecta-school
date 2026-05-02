package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.CurriculumGrade;
import com.example.authhexagonal.domain.model.CurriculumObjective;
import com.example.authhexagonal.domain.model.CurriculumSubject;

import java.util.List;
import java.util.UUID;

public interface CurriculumRepository {

    List<CurriculumSubject> findAllSubjects();

    List<CurriculumGrade> findGradesBySubjectId(UUID subjectId);

    List<CurriculumObjective> findObjectivesByGradeId(UUID gradeId);

    List<CurriculumObjective> searchObjectives(UUID subjectId, String grado, String eje, String tipo);

    List<CurriculumObjective> findObjectivesByContext(String subjectName, String courseName);
}
