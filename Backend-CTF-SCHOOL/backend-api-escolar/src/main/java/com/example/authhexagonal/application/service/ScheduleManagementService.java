package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.ScheduleBlock;
import com.example.authhexagonal.domain.model.ScheduleCatalog;
import com.example.authhexagonal.domain.model.ScheduleCourseOption;
import com.example.authhexagonal.domain.model.ScheduleEntry;
import com.example.authhexagonal.domain.model.SchedulePeriodOption;
import com.example.authhexagonal.domain.model.ScheduleTeacherOption;
import com.example.authhexagonal.domain.port.in.ManageSchedulesUseCase;
import com.example.authhexagonal.domain.port.out.ManageSchedulesPort;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
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
                manageSchedulesPort.findActiveSchedulePeriods(),
                manageSchedulesPort.findActiveScheduleTeachers(),
                manageSchedulesPort.findAvailableScheduleSubjects(),
                manageSchedulesPort.findWeeklyScheduleBlocks()
        );
    }

    @Override
    public List<ScheduleEntry> findByCourse(Long courseId, Long periodId) {
        findCourse(courseId);
        findPeriod(periodId);
        return manageSchedulesPort.findSchedulesByCourseIdAndPeriodId(courseId, periodId);
    }

    @Override
    public ScheduleEntry create(Long periodId, Long courseId, Long subjectId, Long teacherId, Long blockId, String room) {
        ScheduleCourseOption course = findCourse(courseId);
        findPeriod(periodId);
        findTeacher(teacherId);
        manageSchedulesPort.findAvailableScheduleSubjectById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        ScheduleBlock block = findBlock(blockId);
        validateBlock(block);
        validateConflicts(courseId, periodId, teacherId, blockId, null);

        Long loadId = manageSchedulesPort.findOrCreateTeachingLoad(teacherId, courseId, subjectId, course.schoolYear(), periodId);
        ScheduleEntry created = manageSchedulesPort.createScheduleEntry(loadId, blockId, normalizeRoom(room));
        manageSchedulesPort.syncWeeklyHours(loadId);
        return created;
    }

    @Override
    public ScheduleEntry update(Long scheduleId, Long periodId, Long courseId, Long subjectId, Long teacherId, Long blockId, String room) {
        ScheduleEntry existing = manageSchedulesPort.findScheduleEntryById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found"));
        ScheduleCourseOption course = findCourse(courseId);
        findPeriod(periodId);
        findTeacher(teacherId);
        manageSchedulesPort.findAvailableScheduleSubjectById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        ScheduleBlock block = findBlock(blockId);
        validateBlock(block);
        validateConflicts(courseId, periodId, teacherId, blockId, scheduleId);

        Long newLoadId = manageSchedulesPort.findOrCreateTeachingLoad(teacherId, courseId, subjectId, course.schoolYear(), periodId);
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

    @Override
    public void updateRowTime(int order, String startTime, String endTime) {
        List<ScheduleBlock> blocks = manageSchedulesPort.findActiveScheduleBlocksByOrder(order);
        if (blocks.isEmpty()) {
            throw new ResourceNotFoundException("Schedule row not found");
        }

        validateTimeRange(startTime, endTime);
        manageSchedulesPort.updateScheduleBlocksTimeByOrder(order, normalizeTime(startTime), normalizeTime(endTime));
    }

    @Override
    public void createBreakRow(String startTime, String endTime) {
        validateTimeRange(startTime, endTime);
        int nextOrder = manageSchedulesPort.findWeeklyScheduleBlocks().stream()
                .mapToInt(ScheduleBlock::order)
                .max()
                .orElse(0) + 1;
        manageSchedulesPort.createBreakBlocks(normalizeTime(startTime), normalizeTime(endTime), nextOrder);
    }

    @Override
    public void deleteBreakRow(int order) {
        List<ScheduleBlock> blocks = manageSchedulesPort.findActiveScheduleBlocksByOrder(order);
        if (blocks.isEmpty()) {
            throw new ResourceNotFoundException("Break row not found");
        }

        boolean breakRow = blocks.stream().allMatch(block -> "RECREO".equalsIgnoreCase(block.blockType()));
        if (!breakRow) {
            throw new IllegalArgumentException("Solo se pueden eliminar filas de recreo");
        }
        if (manageSchedulesPort.hasScheduleEntriesForOrder(order)) {
            throw new IllegalArgumentException("No se puede eliminar una fila que tiene horarios asignados");
        }
        manageSchedulesPort.deactivateScheduleBlocksByOrder(order);
    }

    private ScheduleCourseOption findCourse(Long courseId) {
        return manageSchedulesPort.findActiveScheduleCourseById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
    }

    private ScheduleTeacherOption findTeacher(Long teacherId) {
        return manageSchedulesPort.findActiveScheduleTeacherById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
    }

    private SchedulePeriodOption findPeriod(Long periodId) {
        return manageSchedulesPort.findActiveSchedulePeriodById(periodId)
                .orElseThrow(() -> new ResourceNotFoundException("Academic period not found"));
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

    private void validateConflicts(Long courseId, Long periodId, Long teacherId, Long blockId, Long scheduleId) {
        if (manageSchedulesPort.hasCourseConflict(courseId, periodId, blockId, scheduleId)) {
            throw new IllegalArgumentException("El curso ya tiene una clase asignada en ese bloque");
        }
        if (manageSchedulesPort.hasTeacherConflict(teacherId, periodId, blockId, scheduleId)) {
            throw new IllegalArgumentException("El profesor ya tiene otra clase asignada en ese bloque");
        }
    }

    private String normalizeRoom(String room) {
        if (room == null || room.isBlank()) {
            return null;
        }
        return room.trim();
    }

    private void validateTimeRange(String startTime, String endTime) {
        LocalTime start = LocalTime.parse(normalizeTime(startTime));
        LocalTime end = LocalTime.parse(normalizeTime(endTime));
        if (!start.isBefore(end)) {
            throw new IllegalArgumentException("La hora de inicio debe ser menor a la hora de termino");
        }
    }

    private String normalizeTime(String value) {
        return LocalTime.parse(value).toString();
    }
}
