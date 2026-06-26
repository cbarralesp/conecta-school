package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.PlanningClass;
import com.example.authhexagonal.domain.model.PlanningClassObjectiveSelection;
import com.example.authhexagonal.domain.model.CurriculumObjective;
import com.example.authhexagonal.domain.model.PlanningDocumentFileType;
import com.example.authhexagonal.domain.model.PlanningClassStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlanningClassRepositoryPort {

    PlanningClass createClass(
            Long unitId,
            String title,
            LocalDate plannedDate,
            String durationCode,
            String durationLabel,
            String objectiveCode,
            String objectiveTitle,
            String objectiveDescription,
            String evaluationType,
            String startActivity,
            String developmentActivity,
            String closingActivity,
            PlanningClassStatus status,
            boolean publishedToStudents,
            Long createdByUserId
    );

    PlanningClass updateTitle(
            Long classId,
            String title
    );

    PlanningClass updateClass(
            Long classId,
            Long unitId,
            String title,
            LocalDate plannedDate,
            String durationCode,
            String durationLabel,
            String objectiveCode,
            String objectiveTitle,
            String objectiveDescription,
            String evaluationType,
            String startActivity,
            String developmentActivity,
            String closingActivity,
            PlanningClassStatus status,
            boolean publishedToStudents
    );

    void deleteClass(Long classId);

    void syncCurriculumObjectives(Long classId, List<UUID> objectiveIds);

    void saveObjectiveSelections(Long classId, List<PlanningClassObjectiveSelection> objectiveSelections);

    List<UUID> findCurriculumObjectiveIdsByClassId(Long classId);

    List<CurriculumObjective> findCurriculumObjectivesByClassId(Long classId);

    Optional<PlanningClass> findAccessibleById(String username, Long classId);

    List<PlanningClass> findClasses(
            String username,
            Long courseId,
            Long subjectId,
            Integer semester,
            Integer month,
            PlanningClassStatus status,
            PlanningDocumentFileType documentType,
            String search
    );
}
