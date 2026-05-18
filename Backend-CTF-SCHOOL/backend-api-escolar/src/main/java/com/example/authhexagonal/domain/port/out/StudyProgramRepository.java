package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.StudyProgramDetail;
import com.example.authhexagonal.domain.model.StudyProgramSummary;

import java.util.List;
import java.util.Optional;

public interface StudyProgramRepository {

    List<StudyProgramSummary> findAllPrograms();

    Optional<StudyProgramDetail> findProgramById(Long programId);
}
