package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.application.service.TeacherManagementService;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.TeacherAccessPreviewRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.TeacherAccessPreviewResponse;
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
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "subjectId", required = false) Long subjectId,
            @RequestParam(name = "status", required = false) String status
    ) {
        return TeacherOverviewResponse.fromDomain(
                teacherManagementService.getOverview(search, subjectId, status)
        );
    }

    @GetMapping("/{teacherId}")
    public TeacherDetailResponse getById(@PathVariable("teacherId") Long teacherId) {
        return TeacherDetailResponse.fromDomain(teacherManagementService.findById(teacherId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeacherDetailResponse create(@Valid @RequestBody TeacherRequest request) {
        return TeacherDetailResponse.fromDomain(teacherManagementService.create(request.toDomain()));
    }

    @PostMapping("/access-preview")
    public TeacherAccessPreviewResponse previewAccess(@RequestBody TeacherAccessPreviewRequest request) {
        return teacherManagementService.previewSystemAccessUsername(
                request.run(),
                request.firstNames(),
                request.paternalLastName(),
                request.maternalLastName(),
                request.staffType()
        );
    }

    @PutMapping("/{teacherId}")
    public TeacherDetailResponse update(@PathVariable("teacherId") Long teacherId, @Valid @RequestBody TeacherRequest request) {
        return TeacherDetailResponse.fromDomain(teacherManagementService.update(teacherId, request.toDomain()));
    }

    @DeleteMapping("/{teacherId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("teacherId") Long teacherId) {
        teacherManagementService.delete(teacherId);
    }
}
