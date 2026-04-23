package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.ScheduleCatalog;
import com.example.authhexagonal.domain.model.ScheduleEntry;

import java.util.List;

public interface ManageSchedulesUseCase {

    ScheduleCatalog getCatalog();

    List<ScheduleEntry> findByCourse(Long courseId, Long periodId);

    ScheduleEntry create(Long periodId, Long courseId, Long subjectId, Long teacherId, Long blockId, String room);

    ScheduleEntry update(Long scheduleId, Long periodId, Long courseId, Long subjectId, Long teacherId, Long blockId, String room);

    void delete(Long scheduleId);

    void updateRowTime(int order, String startTime, String endTime);

    void createBreakRow(String startTime, String endTime);

    void deleteBreakRow(int order);
}
