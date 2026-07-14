package com.example.authhexagonal.application.service;

import com.example.authhexagonal.application.support.AcademicSemesterResolver;
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

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;

@Service
public class ScheduleManagementService implements ManageSchedulesUseCase {

    private final ManageSchedulesPort manageSchedulesPort;

    public ScheduleManagementService(ManageSchedulesPort manageSchedulesPort) {
        this.manageSchedulesPort = manageSchedulesPort;
    }

    @Override
    public ScheduleCatalog getCatalog(Long courseId) {
        if (courseId != null) {
            validateCourseScope(courseId);
            manageSchedulesPort.ensureCourseSpecificScheduleBlocks(courseId);
        }
        int currentYear = LocalDate.now().getYear();
        int preferredSemester = AcademicSemesterResolver.resolveCurrentSemester();
        return new ScheduleCatalog(
                manageSchedulesPort.findActiveScheduleCourses(),
                manageSchedulesPort.findActiveSchedulePeriods().stream()
                        .sorted(Comparator
                                .comparing((SchedulePeriodOption period) -> period.schoolYear() == currentYear ? 0 : 1)
                                .thenComparing((SchedulePeriodOption period) ->
                                        period.schoolYear() == currentYear && period.semester() == preferredSemester ? 0 : 1)
                                .thenComparing(SchedulePeriodOption::schoolYear, Comparator.reverseOrder())
                                .thenComparing(SchedulePeriodOption::semester))
                        .toList(),
                manageSchedulesPort.findActiveScheduleTeachers(),
                manageSchedulesPort.findAvailableScheduleSubjects(),
                manageSchedulesPort.findWeeklyScheduleBlocks(courseId)
        );
    }

    @Override
    public List<ScheduleEntry> findByCourse(Long courseId, Long periodId) {
        validateCourseScope(courseId);
        findPeriod(periodId);
        manageSchedulesPort.ensureCourseSpecificScheduleBlocks(courseId);
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
    public void updateRowTime(Long courseId, int order, String startTime, String endTime) {
        validateCourseScope(courseId);
        manageSchedulesPort.ensureCourseSpecificScheduleBlocks(courseId);
        List<ScheduleBlock> blocks = manageSchedulesPort.findActiveScheduleBlocksByOrder(courseId, order);
        if (blocks.isEmpty()) {
            throw new ResourceNotFoundException("Schedule row not found");
        }

        validateTimeRange(startTime, endTime);
        manageSchedulesPort.updateScheduleBlocksTimeByOrder(courseId, order, normalizeTime(startTime), normalizeTime(endTime));
    }

    @Override
    public void createRow(Long courseId, String startTime, String endTime, String blockType) {
        validateCourseScope(courseId);
        manageSchedulesPort.ensureCourseSpecificScheduleBlocks(courseId);
        String normalizedStartTime = normalizeTime(startTime);
        String normalizedEndTime = normalizeTime(endTime);
        validateTimeRange(normalizedStartTime, normalizedEndTime);
        String normalizedBlockType = normalizeBlockType(blockType);
        int insertionOrder = resolveInsertionOrder(courseId, normalizedStartTime, normalizedEndTime, normalizedBlockType);
        manageSchedulesPort.shiftScheduleBlockOrdersFrom(courseId, insertionOrder);
        manageSchedulesPort.createScheduleBlocks(courseId, normalizedStartTime, normalizedEndTime, insertionOrder, normalizedBlockType);
    }

    @Override
    public void createBreakRow(Long courseId, String startTime, String endTime) {
        createRow(courseId, startTime, endTime, "RECREO");
    }

    @Override
    public void deleteRow(Long courseId, int order) {
        validateCourseScope(courseId);
        manageSchedulesPort.ensureCourseSpecificScheduleBlocks(courseId);
        List<ScheduleBlock> blocks = manageSchedulesPort.findActiveScheduleBlocksByOrder(courseId, order);
        if (blocks.isEmpty()) {
            throw new ResourceNotFoundException("Schedule row not found");
        }

        if (manageSchedulesPort.hasScheduleEntriesForOrder(courseId, order)) {
            throw new IllegalArgumentException("No se puede eliminar una fila que tiene horarios asignados");
        }
        manageSchedulesPort.deactivateScheduleBlocksByOrder(courseId, order);
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

    private String normalizeBlockType(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Debes indicar el tipo de bloque");
        }

        String normalized = value.trim().toUpperCase();
        if (!"CLASE".equals(normalized) && !"RECREO".equals(normalized)) {
            throw new IllegalArgumentException("Tipo de bloque no valido");
        }
        return normalized;
    }

    private int resolveInsertionOrder(Long courseId, String startTime, String endTime, String blockType) {
        LocalTime start = LocalTime.parse(startTime);
        LocalTime end = LocalTime.parse(endTime);

        List<ScheduleBlock> orderedRows = manageSchedulesPort.findWeeklyScheduleBlocks(courseId).stream()
                .collect(java.util.stream.Collectors.toMap(
                        ScheduleBlock::order,
                        block -> block,
                        (left, right) -> left
                ))
                .values()
                .stream()
                .sorted(Comparator
                        .comparing((ScheduleBlock block) -> LocalTime.parse(block.startTime()))
                        .thenComparing(block -> LocalTime.parse(block.endTime()))
                        .thenComparingInt(ScheduleBlock::order))
                .toList();

        for (ScheduleBlock row : orderedRows) {
            LocalTime rowStart = LocalTime.parse(row.startTime());
            LocalTime rowEnd = LocalTime.parse(row.endTime());

            if (rowStart.equals(start) && rowEnd.equals(end) && row.blockType().equalsIgnoreCase(blockType)) {
                throw new IllegalArgumentException("Ya existe un bloque activo con ese horario");
            }

            if (start.isBefore(rowStart) || (start.equals(rowStart) && end.isBefore(rowEnd))) {
                return row.order();
            }
        }

        return orderedRows.stream()
                .mapToInt(ScheduleBlock::order)
                .max()
                .orElse(0) + 1;
    }

    private void validateCourseScope(Long courseId) {
        if (courseId == null) {
            throw new IllegalArgumentException("Debes seleccionar un curso");
        }
        findCourse(courseId);
    }
}
