package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.ManageSubjectsUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.SubjectRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.SubjectResponse;
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

import java.util.List;

@RestController
@RequestMapping("/api/asignaturas")
public class SubjectController {

    private final ManageSubjectsUseCase manageSubjectsUseCase;

    public SubjectController(ManageSubjectsUseCase manageSubjectsUseCase) {
        this.manageSubjectsUseCase = manageSubjectsUseCase;
    }

    @GetMapping
    public List<SubjectResponse> findAll(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "level", required = false) String level
    ) {
        return manageSubjectsUseCase.findAll(search, level).stream()
                .map(SubjectResponse::fromDomain)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SubjectResponse create(@Valid @RequestBody SubjectRequest request) {
        return SubjectResponse.fromDomain(
                manageSubjectsUseCase.create(
                        request.code(),
                        request.name(),
                        request.area(),
                        request.colorHex(),
                        request.description(),
                        request.referenceLevel(),
                        request.evaluationType(),
                        request.suggestedHours(),
                        request.teacherIds(),
                        request.applicableGradeIds(),
                        request.applicableCourseIds()
                )
        );
    }

    @PutMapping("/{subjectId}")
    public SubjectResponse update(@PathVariable("subjectId") Long subjectId, @Valid @RequestBody SubjectRequest request) {
        return SubjectResponse.fromDomain(
                manageSubjectsUseCase.update(
                        subjectId,
                        request.code(),
                        request.name(),
                        request.area(),
                        request.colorHex(),
                        request.description(),
                        request.referenceLevel(),
                        request.evaluationType(),
                        request.suggestedHours(),
                        request.teacherIds(),
                        request.applicableGradeIds(),
                        request.applicableCourseIds()
                )
        );
    }

    @DeleteMapping("/{subjectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("subjectId") Long subjectId) {
        manageSubjectsUseCase.delete(subjectId);
    }
}
