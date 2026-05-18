package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.StudyProgramDetail;
import com.example.authhexagonal.domain.model.StudyProgramSummary;

import java.util.List;

public interface GetStudyProgramsUseCase {

    List<StudyProgramSummary> findPrograms(String subjectName, String grade, String courseName);

    StudyProgramDetail getProgram(Long programId);

    List<StudyProgramDetail.Unit> getUnits(Long programId);

    List<StudyProgramDetail.ObjectiveDetail> getPermanentObjectives(Long programId);

    List<StudyProgramDetail.ObjectiveDetail> getUnitObjectives(Long programId, Integer unitNumber);
}
