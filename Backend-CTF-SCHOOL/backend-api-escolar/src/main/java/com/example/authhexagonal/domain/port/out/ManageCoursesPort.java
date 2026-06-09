package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.Course;
import com.example.authhexagonal.domain.model.CourseGrade;

import java.util.List;
import java.util.Optional;

public interface ManageCoursesPort {

    List<CourseGrade> findActiveGrades();

    List<Course> findAllActive();

    Optional<Course> findActiveById(Long courseId);

    boolean existsByCode(String code);

    boolean existsByCodeExcludingId(String code, Long courseId);

    Course create(String code, String name, String level, String letter, int schoolYear, String scheduleType);

    void assignTeacherTeam(Long courseId, Long teacherId, Long assistantId);

    void assignStudents(Long courseId, List<Long> studentIds);

    List<Long> findActiveStudentIds(Long courseId);

    void syncStudents(Long courseId, List<Long> studentIds);

    Course update(Long courseId, String code, String name, String level, String letter, int schoolYear, String scheduleType);

    void deactivate(Long courseId);
}
