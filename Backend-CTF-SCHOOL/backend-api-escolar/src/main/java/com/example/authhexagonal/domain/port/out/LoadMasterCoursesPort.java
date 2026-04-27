package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.MasterCourse;
import com.example.authhexagonal.domain.model.StudentCatalogItem;
import com.example.authhexagonal.domain.model.TeacherCatalogItem;

import java.util.List;
import java.util.Optional;

public interface LoadMasterCoursesPort {

    List<MasterCourse> search(String query);

    Optional<MasterCourse> findById(Long masterCourseId);

    List<TeacherCatalogItem> searchTeachers(String query);

    Optional<TeacherCatalogItem> findTeacherById(Long teacherId);

    List<StudentCatalogItem> searchUnassignedStudents(String query);

    Optional<StudentCatalogItem> findUnassignedStudentById(Long studentId);
}
