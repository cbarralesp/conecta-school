package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.Course;
import com.example.authhexagonal.domain.model.CourseGrade;
import com.example.authhexagonal.domain.model.MasterCourse;
import com.example.authhexagonal.domain.model.StudentCatalogItem;
import com.example.authhexagonal.domain.model.TeacherCatalogItem;

import java.util.List;

public interface ManageCoursesUseCase {

    List<CourseGrade> findActiveGrades();

    List<Course> findAll();

    Course findById(Long courseId);

    List<MasterCourse> searchMasterCourses(String query);

    List<TeacherCatalogItem> searchTeachers(String query);

    List<StudentCatalogItem> searchAvailableStudents(Long masterCourseId, String query);

    List<StudentCatalogItem> searchAllUnassignedStudents(String query);

    Course create(String code, String name, String level, String letter, int schoolYear, String scheduleType);

    Course createFromMaster(Long masterCourseId, String parallel, int schoolYear, String scheduleType, Long teacherId, Long assistantId, List<Long> studentIds);

    Course update(Long courseId, String code, String name, String level, String letter, int schoolYear, String scheduleType, Long teacherId, Long assistantId, List<Long> studentIds);

    void delete(Long courseId);
}
