package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.ScheduleCatalog;
import com.example.authhexagonal.domain.model.ScheduleEntry;

import java.util.List;

public interface ManageSchedulesUseCase {

    ScheduleCatalog getCatalog();

    List<ScheduleEntry> findByCourse(Long courseId);

    ScheduleEntry create(Long courseId, Long subjectId, Long teacherId, Long blockId, String room);

    ScheduleEntry update(Long scheduleId, Long courseId, Long subjectId, Long teacherId, Long blockId, String room);

    void delete(Long scheduleId);
}
