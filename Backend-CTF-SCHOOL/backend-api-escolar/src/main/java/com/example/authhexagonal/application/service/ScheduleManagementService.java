package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.ScheduleBlock;
import com.example.authhexagonal.domain.model.ScheduleCatalog;
import com.example.authhexagonal.domain.model.ScheduleCourseOption;
import com.example.authhexagonal.domain.model.ScheduleEntry;
import com.example.authhexagonal.domain.model.ScheduleTeacherOption;
import com.example.authhexagonal.domain.port.in.ManageSchedulesUseCase;
import com.example.authhexagonal.domain.port.out.ManageSchedulesPort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ScheduleManagementService implements ManageSchedulesUseCase {

    private final ManageSchedulesPort manageSchedulesPort;

    public ScheduleManagementService(ManageSchedulesPort manageSchedulesPort) {
        this.manageSchedulesPort = manageSchedulesPort;
    }

    @Override
    public ScheduleCatalog getCatalog() {
        return new ScheduleCatalog(
                manageSchedulesPort.findActiveScheduleCourses(),
                manageSchedulesPort.findActiveScheduleTeachers(),
                manageSchedulesPort.findAvailableScheduleSubjects(),
                manageSchedulesPort.findWeeklyScheduleBlocks()
        );
    }

    @Override
    public List<ScheduleEntry> findByCourse(Long courseId) {
        findCourse(courseId);
        return manageSchedulesPort.findSchedulesByCourseId(courseId);
    }

    @Override
    public ScheduleEntry create(Long courseId, Long subjectId, Long teacherId, Long blockId, String room) {
        ScheduleCourseOption course = findCourse(courseId);
        findTeacher(teacherId);
        manageSchedulesPort.findAvailableScheduleSubjectById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        ScheduleBlock block = findBlock(blockId);
        validateBlock(block);
        validateConflicts(courseId, teacherId, blockId, null);

        Long loadId = manageSchedulesPort.findOrCreateTeachingLoad(teacherId, courseId, subjectId, course.schoolYear());
        ScheduleEntry created = manageSchedulesPort.createScheduleEntry(loadId, blockId, normalizeRoom(room));
        manageSchedulesPort.syncWeeklyHours(loadId);
        return created;
    }

    @Override
    public ScheduleEntry update(Long scheduleId, Long courseId, Long subjectId, Long teacherId, Long blockId, String room) {
        ScheduleEntry existing = manageSchedulesPort.findScheduleEntryById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found"));
        ScheduleCourseOption course = findCourse(courseId);
        findTeacher(teacherId);
        manageSchedulesPort.findAvailableScheduleSubjectById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        ScheduleBlock block = findBlock(blockId);
        validateBlock(block);
        validateConflicts(courseId, teacherId, blockId, scheduleId);

        Long newLoadId = manageSchedulesPort.findOrCreateTeachingLoad(teacherId, courseId, subjectId, course.schoolYear());
        ScheduleEntry updated = manageSchedulesPort.updateScheduleEntry(scheduleId, newLoadId, blockId, normalizeRoom(room));
        manageSchedulesPort.syncWeeklyHours(existing.loadId());
        manageSchedulesPort.syncWeeklyHours(newLoadId);
        return updated;
    }

    @Override
    public void delete(Long scheduleId) {
        ScheduleEntry existing = manageSchedulesPort.findScheduleEntryById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found"));
        manageSchedulesPort.deleteScheduleEntry(scheduleId);
        manageSchedulesPort.syncWeeklyHours(existing.loadId());
    }

    private ScheduleCourseOption findCourse(Long courseId) {
        return manageSchedulesPort.findActiveScheduleCourseById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
    }

    private ScheduleTeacherOption findTeacher(Long teacherId) {
        return manageSchedulesPort.findActiveScheduleTeacherById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
    }

    private ScheduleBlock findBlock(Long blockId) {
        return manageSchedulesPort.findActiveScheduleBlockById(blockId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule block not found"));
    }

    private void validateBlock(ScheduleBlock block) {
        if (!"CLASE".equalsIgnoreCase(block.blockType())) {
            throw new IllegalArgumentException("Solo se pueden asignar bloques de clase");
        }
    }

    private void validateConflicts(Long courseId, Long teacherId, Long blockId, Long scheduleId) {
        if (manageSchedulesPort.hasCourseConflict(courseId, blockId, scheduleId)) {
            throw new IllegalArgumentException("El curso ya tiene una clase asignada en ese bloque");
        }
        if (manageSchedulesPort.hasTeacherConflict(teacherId, blockId, scheduleId)) {
            throw new IllegalArgumentException("El profesor ya tiene otra clase asignada en ese bloque");
        }
    }

    private String normalizeRoom(String room) {
        if (room == null || room.isBlank()) {
            return null;
        }
        return room.trim();
    }
}
