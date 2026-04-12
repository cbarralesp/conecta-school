package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.application.service.TeacherManagementService;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.TeacherDetailResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.TeacherOverviewResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.TeacherRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profesores")
public class TeacherController {

    private final TeacherManagementService teacherManagementService;

    public TeacherController(TeacherManagementService teacherManagementService) {
        this.teacherManagementService = teacherManagementService;
    }

    @GetMapping
    public TeacherOverviewResponse getOverview(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) String status
    ) {
        return TeacherOverviewResponse.fromDomain(
                teacherManagementService.getOverview(search, subjectId, status)
        );
    }

    @GetMapping("/{teacherId}")
    public TeacherDetailResponse getById(@PathVariable Long teacherId) {
        return TeacherDetailResponse.fromDomain(teacherManagementService.findById(teacherId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeacherDetailResponse create(@Valid @RequestBody TeacherRequest request) {
        return TeacherDetailResponse.fromDomain(teacherManagementService.create(request.toDomain()));
    }

    @PutMapping("/{teacherId}")
    public TeacherDetailResponse update(@PathVariable Long teacherId, @Valid @RequestBody TeacherRequest request) {
        return TeacherDetailResponse.fromDomain(teacherManagementService.update(teacherId, request.toDomain()));
    }

    @DeleteMapping("/{teacherId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long teacherId) {
        teacherManagementService.delete(teacherId);
    }
}
