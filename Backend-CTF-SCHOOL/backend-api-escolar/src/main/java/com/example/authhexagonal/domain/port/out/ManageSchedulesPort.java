package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.AcademicSubject;
import com.example.authhexagonal.domain.model.ScheduleBlock;
import com.example.authhexagonal.domain.model.ScheduleCourseOption;
import com.example.authhexagonal.domain.model.ScheduleEntry;
import com.example.authhexagonal.domain.model.SchedulePeriodOption;
import com.example.authhexagonal.domain.model.ScheduleTeacherOption;

import java.util.List;
import java.util.Optional;

public interface ManageSchedulesPort {

    List<ScheduleEntry> findSchedulesByCourseId(Long courseId);
    
    List<ScheduleEntry> findSchedulesByCourseIdAndPeriodId(Long courseId, Long periodId);

    Optional<ScheduleEntry> findScheduleEntryById(Long scheduleId);

    List<ScheduleCourseOption> findActiveScheduleCourses();

    List<SchedulePeriodOption> findActiveSchedulePeriods();

    Optional<SchedulePeriodOption> findActiveSchedulePeriodById(Long periodId);

    Optional<ScheduleCourseOption> findActiveScheduleCourseById(Long courseId);

    List<ScheduleTeacherOption> findActiveScheduleTeachers();

    Optional<ScheduleTeacherOption> findActiveScheduleTeacherById(Long teacherId);

    List<AcademicSubject> findAvailableScheduleSubjects();

    Optional<AcademicSubject> findAvailableScheduleSubjectById(Long subjectId);

    List<ScheduleBlock> findWeeklyScheduleBlocks();

    Optional<ScheduleBlock> findActiveScheduleBlockById(Long blockId);

    List<ScheduleBlock> findActiveScheduleBlocksByOrder(int order);

    boolean hasCourseConflict(Long courseId, Long periodId, Long blockId, Long excludeScheduleId);

    boolean hasTeacherConflict(Long teacherId, Long periodId, Long blockId, Long excludeScheduleId);

    Long findOrCreateTeachingLoad(Long teacherId, Long courseId, Long subjectId, int schoolYear, Long periodId);

    ScheduleEntry createScheduleEntry(Long loadId, Long blockId, String room);

    ScheduleEntry updateScheduleEntry(Long scheduleId, Long loadId, Long blockId, String room);

    void deleteScheduleEntry(Long scheduleId);

    void syncWeeklyHours(Long loadId);

    void updateScheduleBlocksTimeByOrder(int order, String startTime, String endTime);

    void createBreakBlocks(String startTime, String endTime, int order);

    void deactivateScheduleBlocksByOrder(int order);

    boolean hasScheduleEntriesForOrder(int order);
}
