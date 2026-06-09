package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.GetCourseScheduleUseCase;
import com.example.authhexagonal.domain.port.in.ManageCoursesUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.CourseRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.CourseGradeResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.CourseResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.CourseScheduleResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.CreateCourseFromMasterRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.MasterCourseResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.StudentCatalogResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.TeacherCatalogResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CourseController {

    private final ManageCoursesUseCase manageCoursesUseCase;
    private final GetCourseScheduleUseCase getCourseScheduleUseCase;

    public CourseController(
            ManageCoursesUseCase manageCoursesUseCase,
            GetCourseScheduleUseCase getCourseScheduleUseCase
    ) {
        this.manageCoursesUseCase = manageCoursesUseCase;
        this.getCourseScheduleUseCase = getCourseScheduleUseCase;
    }

    @GetMapping("/cursos")
    public List<CourseResponse> findAll() {
        return manageCoursesUseCase.findAll().stream()
                .map(CourseResponse::fromDomain)
                .toList();
    }

    @GetMapping("/cursos-grados")
    public List<CourseGradeResponse> findCourseGrades() {
        return manageCoursesUseCase.findActiveGrades().stream()
                .map(CourseGradeResponse::fromDomain)
                .toList();
    }

    @GetMapping("/cursos-maestros")
    public List<MasterCourseResponse> searchMasterCourses(@RequestParam(name = "search", defaultValue = "") String search) {
        return manageCoursesUseCase.searchMasterCourses(search).stream()
                .map(MasterCourseResponse::fromDomain)
                .toList();
    }

    @GetMapping("/profesores-catalogo")
    public List<TeacherCatalogResponse> searchTeachers(@RequestParam(name = "search", defaultValue = "") String search) {
        return manageCoursesUseCase.searchTeachers(search).stream()
                .map(TeacherCatalogResponse::fromDomain)
                .toList();
    }

    @GetMapping("/alumnos/disponibles")
    public List<StudentCatalogResponse> searchAvailableStudents(
            @RequestParam(name = "masterCourseId") Long masterCourseId,
            @RequestParam(name = "search", defaultValue = "") String search
    ) {
        return manageCoursesUseCase.searchAvailableStudents(masterCourseId, search).stream()
                .map(StudentCatalogResponse::fromDomain)
                .toList();
    }

    @GetMapping("/alumnos/universo")
    public List<StudentCatalogResponse> searchAllUnassignedStudents(@RequestParam(name = "search", defaultValue = "") String search) {
        return manageCoursesUseCase.searchAllUnassignedStudents(search).stream()
                .map(StudentCatalogResponse::fromDomain)
                .toList();
    }

    @GetMapping("/cursos/{courseId}")
    public CourseResponse findById(@PathVariable("courseId") Long courseId) {
        return CourseResponse.fromDomain(manageCoursesUseCase.findById(courseId));
    }

    @PostMapping("/cursos")
    @ResponseStatus(HttpStatus.CREATED)
    public CourseResponse create(@Valid @RequestBody CourseRequest request) {
        return CourseResponse.fromDomain(
                manageCoursesUseCase.create(
                        request.code(),
                        request.name(),
                        request.level(),
                        request.letter(),
                        request.schoolYear(),
                        request.scheduleType()
                )
        );
    }

    @PostMapping("/cursos/crear-desde-maestro")
    @ResponseStatus(HttpStatus.CREATED)
    public CourseResponse createFromMaster(@Valid @RequestBody CreateCourseFromMasterRequest request) {
        return CourseResponse.fromDomain(
                manageCoursesUseCase.createFromMaster(
                        request.masterCourseId(),
                        request.parallel(),
                        request.schoolYear(),
                        request.scheduleType(),
                        request.teacherId(),
                        request.assistantId(),
                        request.studentIds()
                )
        );
    }

    @PutMapping("/cursos/{courseId}")
    public CourseResponse update(@PathVariable("courseId") Long courseId, @Valid @RequestBody CourseRequest request) {
        return CourseResponse.fromDomain(
                manageCoursesUseCase.update(
                        courseId,
                        request.code(),
                        request.name(),
                        request.level(),
                        request.letter(),
                        request.schoolYear(),
                        request.scheduleType(),
                        request.teacherId(),
                        request.assistantId(),
                        request.studentIds()
                )
        );
    }

    @DeleteMapping("/cursos/{courseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("courseId") Long courseId) {
        manageCoursesUseCase.delete(courseId);
    }

    @GetMapping("/horario")
    public List<CourseScheduleResponse> schedule() {
        return getCourseScheduleUseCase.findAll().stream()
                .map(CourseScheduleResponse::fromDomain)
                .toList();
    }
}
