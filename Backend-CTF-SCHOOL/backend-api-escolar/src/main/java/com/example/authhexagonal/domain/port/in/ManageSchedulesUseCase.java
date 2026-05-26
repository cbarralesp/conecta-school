package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.ScheduleCatalog;
import com.example.authhexagonal.domain.model.ScheduleEntry;

import java.util.List;

public interface ManageSchedulesUseCase {

    ScheduleCatalog getCatalog(Long courseId);

    List<ScheduleEntry> findByCourse(Long courseId, Long periodId);

    ScheduleEntry create(Long periodId, Long courseId, Long subjectId, Long teacherId, Long blockId, String room);

    ScheduleEntry update(Long scheduleId, Long periodId, Long courseId, Long subjectId, Long teacherId, Long blockId, String room);

    void delete(Long scheduleId);

    void updateRowTime(Long courseId, int order, String startTime, String endTime);

    void createRow(Long courseId, String startTime, String endTime, String blockType);

    void createBreakRow(Long courseId, String startTime, String endTime);

    void deleteRow(Long courseId, int order);
}
