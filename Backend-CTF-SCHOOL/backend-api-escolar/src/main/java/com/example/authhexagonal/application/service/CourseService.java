package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.Course;
import com.example.authhexagonal.domain.model.MasterCourse;
import com.example.authhexagonal.domain.model.StudentCatalogItem;
import com.example.authhexagonal.domain.model.TeacherCatalogItem;
import com.example.authhexagonal.domain.port.in.ManageCoursesUseCase;
import com.example.authhexagonal.domain.port.out.LoadMasterCoursesPort;
import com.example.authhexagonal.domain.port.out.ManageCoursesPort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CourseService implements ManageCoursesUseCase {

    private final ManageCoursesPort manageCoursesPort;
    private final LoadMasterCoursesPort loadMasterCoursesPort;

    public CourseService(ManageCoursesPort manageCoursesPort, LoadMasterCoursesPort loadMasterCoursesPort) {
        this.manageCoursesPort = manageCoursesPort;
        this.loadMasterCoursesPort = loadMasterCoursesPort;
    }

    @Override
    public List<Course> findAll() {
        return manageCoursesPort.findAllActive();
    }

    @Override
    public Course findById(Long courseId) {
        return manageCoursesPort.findActiveById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
    }

    @Override
    public List<MasterCourse> searchMasterCourses(String query) {
        return loadMasterCoursesPort.search(query);
    }

    @Override
    public List<TeacherCatalogItem> searchTeachers(String query) {
        return loadMasterCoursesPort.searchTeachers(query);
    }

    @Override
    public List<StudentCatalogItem> searchAvailableStudents(Long masterCourseId, String query) {
        MasterCourse masterCourse = loadMasterCoursesPort.findById(masterCourseId)
                .orElseThrow(() -> new ResourceNotFoundException("Master course not found"));

        int grade = gradeFromDescription(masterCourse.description());
        int minAge = 5 + grade;
        int maxAge = 6 + grade;

        return loadMasterCoursesPort.searchUnassignedStudents(query).stream()
                .filter(student -> student.age() >= minAge && student.age() <= maxAge)
                .toList();
    }

    @Override
    public List<StudentCatalogItem> searchAllUnassignedStudents(String query) {
        return loadMasterCoursesPort.searchUnassignedStudents(query);
    }

    @Override
    public Course create(String code, String name, String level, String letter, int schoolYear, String scheduleType) {
        validateDuplicateCode(code, null);
        return manageCoursesPort.create(code, name, level, letter, schoolYear, scheduleType);
    }

    @Override
    public Course createFromMaster(Long masterCourseId, String parallel, int schoolYear, String scheduleType, Long teacherId, Long assistantId, List<Long> studentIds) {
        MasterCourse masterCourse = loadMasterCoursesPort.findById(masterCourseId)
                .orElseThrow(() -> new ResourceNotFoundException("Master course not found"));
        TeacherCatalogItem teacher = loadMasterCoursesPort.findTeacherById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        TeacherCatalogItem assistant = assistantId == null ? null : loadMasterCoursesPort.findTeacherById(assistantId)
                .orElseThrow(() -> new ResourceNotFoundException("Assistant not found"));

        ParsedCourseDescription parsed = parseDescription(masterCourse.description());
        String normalizedParallel = normalizeParallel(parallel);
        String generatedCode = generateCourseCode(masterCourse, normalizedParallel, schoolYear);
        validateDuplicateCode(generatedCode, null);

        Course course = manageCoursesPort.create(
                generatedCode,
                formatCourseName(parsed.level()),
                formatCourseName(parsed.level()),
                normalizedParallel,
                schoolYear,
                scheduleType
        );
        manageCoursesPort.assignTeacherTeam(course.id(), teacher.id(), assistant == null ? null : assistant.id());
        validateStudents(studentIds);
        manageCoursesPort.assignStudents(course.id(), studentIds);
        return course;
    }

    @Override
    public Course update(Long courseId, String code, String name, String level, String letter, int schoolYear, String scheduleType, List<Long> studentIds) {
        findById(courseId);
        validateDuplicateCode(code, courseId);
        Course updatedCourse = manageCoursesPort.update(courseId, code, name, level, letter, schoolYear, scheduleType);
        if (studentIds != null) {
            validateStudentsForUpdate(courseId, studentIds);
            manageCoursesPort.syncStudents(courseId, studentIds);
        }
        return updatedCourse;
    }

    @Override
    public void delete(Long courseId) {
        findById(courseId);
        manageCoursesPort.deactivate(courseId);
    }

    private void validateDuplicateCode(String code, Long courseId) {
        boolean exists = courseId == null
                ? manageCoursesPort.existsActiveByCode(code)
                : manageCoursesPort.existsActiveByCodeExcludingId(code, courseId);

        if (exists) {
            throw new IllegalArgumentException("Course code already exists");
        }
    }

    private ParsedCourseDescription parseDescription(String description) {
        int lastSpace = description.lastIndexOf(' ');
        if (lastSpace <= 0 || lastSpace == description.length() - 1) {
            throw new IllegalArgumentException("Invalid master course description");
        }

        return new ParsedCourseDescription(
                description.substring(0, lastSpace).trim(),
                description.substring(lastSpace + 1).trim()
        );
    }

    private String generateCourseCode(MasterCourse masterCourse, String parallel, int schoolYear) {
        String normalizedMasterCode = masterCourse.code() == null ? "" : masterCourse.code().trim().toUpperCase();
        if (normalizedMasterCode.startsWith("CUR-")) {
            return courseCodeToken(masterCourse.description()) + parallel + "-" + schoolYear;
        }

        return courseCodeToken(masterCourse.description()) + parallel + "-" + schoolYear;
    }

    private int gradeFromDescription(String description) {
        String normalized = description.toLowerCase();
        if (normalized.startsWith("primero")) {
            return 1;
        }
        if (normalized.startsWith("segundo")) {
            return 2;
        }
        if (normalized.startsWith("tercero")) {
            return 3;
        }
        if (normalized.startsWith("cuarto")) {
            return 4;
        }
        if (normalized.startsWith("quinto")) {
            return 5;
        }
        if (normalized.startsWith("sexto")) {
            return 6;
        }
        if (normalized.startsWith("septimo")) {
            return 7;
        }
        if (normalized.startsWith("octavo")) {
            return 8;
        }
        throw new IllegalArgumentException("Unsupported master course description");
    }

    private String courseCodeToken(String description) {
        return String.valueOf(gradeFromDescription(description));
    }

    private String normalizeParallel(String parallel) {
        String normalized = parallel == null ? "" : parallel.trim().toUpperCase();
        if (!normalized.matches("[A-F]")) {
            throw new IllegalArgumentException("Parallel not supported");
        }
        return normalized;
    }

    private String formatCourseName(String level) {
        return level
                .replaceFirst("(?i)^PRIMERO\\b", "1")
                .replaceFirst("(?i)^SEGUNDO\\b", "2")
                .replaceFirst("(?i)^TERCERO\\b", "3")
                .replaceFirst("(?i)^CUARTO\\b", "4")
                .replaceFirst("(?i)^QUINTO\\b", "5")
                .replaceFirst("(?i)^SEXTO\\b", "6")
                .replaceFirst("(?i)^SEPTIMO\\b", "7")
                .replaceFirst("(?i)^OCTAVO\\b", "8")
                .replaceFirst("(?i)^NOVENO\\b", "9")
                .replaceFirst("(?i)^DECIMO\\b", "10")
                .replaceAll("(?i)\\bBASICO\\b", "Básico")
                .replaceAll("(?i)\\bMEDIO\\b", "Medio")
                .trim();
    }

    private void validateStudents(List<Long> studentIds) {
        if (studentIds == null || studentIds.isEmpty()) {
            return;
        }

        long validCount = studentIds.stream()
                .map(loadMasterCoursesPort::findUnassignedStudentById)
                .filter(Optional::isPresent)
                .count();

        if (validCount != studentIds.size()) {
            throw new IllegalArgumentException("One or more students are not available for assignment");
        }
    }

    private void validateStudentsForUpdate(Long courseId, List<Long> studentIds) {
        if (studentIds == null || studentIds.isEmpty()) {
            return;
        }

        List<Long> currentStudentIds = manageCoursesPort.findActiveStudentIds(courseId);
        long validCount = studentIds.stream()
                .filter(studentId -> currentStudentIds.contains(studentId)
                        || loadMasterCoursesPort.findUnassignedStudentById(studentId).isPresent())
                .count();

        if (validCount != studentIds.size()) {
            throw new IllegalArgumentException("One or more students are not available for this course");
        }
    }

    private record ParsedCourseDescription(String level, String letter) {
    }
}
