package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.Course;
import com.example.authhexagonal.domain.model.CourseGrade;
import com.example.authhexagonal.domain.model.MasterCourse;
import com.example.authhexagonal.domain.model.StudentCatalogItem;
import com.example.authhexagonal.domain.model.TeacherCatalogItem;
import com.example.authhexagonal.domain.port.in.ManageCoursesUseCase;
import com.example.authhexagonal.domain.port.out.LoadMasterCoursesPort;
import com.example.authhexagonal.domain.port.out.ManageCoursesPort;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
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
    public List<CourseGrade> findActiveGrades() {
        return manageCoursesPort.findActiveGrades();
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

        CourseLevelDefinition definition = resolveCourseLevel(masterCourse);

        return loadMasterCoursesPort.searchUnassignedStudents(query).stream()
                .filter(student -> student.age() >= definition.minAge() && student.age() <= definition.maxAge())
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

        CourseLevelDefinition definition = resolveCourseLevel(masterCourse);
        String normalizedParallel = normalizeParallel(parallel);
        String generatedCode = generateCourseCode(masterCourse, normalizedParallel, schoolYear);
        validateDuplicateCode(generatedCode, null);

        Course course = manageCoursesPort.create(
                generatedCode,
                definition.courseName(),
                definition.levelName(),
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
    public Course update(Long courseId, String code, String name, String level, String letter, int schoolYear, String scheduleType, Long teacherId, Long assistantId, List<Long> studentIds) {
        findById(courseId);
        validateDuplicateCode(code, courseId);
        if (teacherId != null) {
            loadMasterCoursesPort.findTeacherById(teacherId)
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        }
        if (assistantId != null) {
            loadMasterCoursesPort.findTeacherById(assistantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Assistant not found"));
        }
        Course updatedCourse = manageCoursesPort.update(courseId, code, name, level, letter, schoolYear, scheduleType);
        if (teacherId != null) {
            manageCoursesPort.assignTeacherTeam(courseId, teacherId, assistantId);
        }
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
                ? manageCoursesPort.existsByCode(code)
                : manageCoursesPort.existsByCodeExcludingId(code, courseId);

        if (exists) {
            throw new IllegalArgumentException("Course code already exists");
        }
    }

    private String generateCourseCode(MasterCourse masterCourse, String parallel, int schoolYear) {
        return courseCodeToken(masterCourse) + parallel + "-" + schoolYear;
    }

    private String courseCodeToken(MasterCourse masterCourse) {
        return resolveCourseLevel(masterCourse).codeToken();
    }

    private String normalizeParallel(String parallel) {
        String normalized = parallel == null ? "" : parallel.trim().toUpperCase();
        if (!normalized.matches("[A-F]")) {
            throw new IllegalArgumentException("Parallel not supported");
        }
        return normalized;
    }

    private CourseLevelDefinition resolveCourseLevel(MasterCourse masterCourse) {
        String courseName = normalizeCourseName(masterCourse.description());
        String levelName = normalizeLevelName(masterCourse.level());

        return switch ((masterCourse.codeToken() == null ? "" : masterCourse.codeToken().trim().toUpperCase())) {
            case "PK" -> new CourseLevelDefinition(courseName, levelName, "PK", 4, 5);
            case "K" -> new CourseLevelDefinition(courseName, levelName, "K", 5, 6);
            case "1" -> new CourseLevelDefinition(courseName, levelName, "1", 6, 7);
            case "2" -> new CourseLevelDefinition(courseName, levelName, "2", 7, 8);
            case "3" -> new CourseLevelDefinition(courseName, levelName, "3", 8, 9);
            case "4" -> new CourseLevelDefinition(courseName, levelName, "4", 9, 10);
            case "5" -> new CourseLevelDefinition(courseName, levelName, "5", 10, 11);
            case "6" -> new CourseLevelDefinition(courseName, levelName, "6", 11, 12);
            case "7" -> new CourseLevelDefinition(courseName, levelName, "7", 12, 13);
            case "8" -> new CourseLevelDefinition(courseName, levelName, "8", 13, 14);
            case "1M" -> new CourseLevelDefinition(courseName, levelName, "1M", 14, 15);
            case "2M" -> new CourseLevelDefinition(courseName, levelName, "2M", 15, 16);
            case "3M" -> new CourseLevelDefinition(courseName, levelName, "3M", 16, 17);
            case "4M" -> new CourseLevelDefinition(courseName, levelName, "4M", 17, 18);
            default -> throw new IllegalArgumentException("Unsupported master course description");
        };
    }

    private String normalizeCourseName(String description) {
        if (description == null || description.isBlank()) {
            return "";
        }

        String normalized = Normalizer.normalize(description.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");

        return switch (normalized.toUpperCase()) {
            case "PRE KINDER", "PRE-KINDER", "PREKINDER", "NT1" -> "Prekinder";
            case "KINDER", "KINDER ", "NT2" -> "Kinder";
            default -> normalized.replaceAll("\\s+", " ").trim();
        };
    }

    private String normalizeLevelName(String level) {
        if (level == null || level.isBlank()) {
            return "";
        }

        String normalized = Normalizer.normalize(level.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return switch (normalized.toUpperCase()) {
            case "INICIAL" -> "Inicial";
            case "BASICO" -> "Basico";
            case "MEDIO" -> "Medio";
            default -> normalized.replaceAll("\\s+", " ").trim();
        };
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

    private record CourseLevelDefinition(String courseName, String levelName, String codeToken, int minAge, int maxAge) {
    }
}
