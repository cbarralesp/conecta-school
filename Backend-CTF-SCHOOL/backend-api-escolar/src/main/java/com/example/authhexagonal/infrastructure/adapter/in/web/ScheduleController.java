package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.ManageSchedulesUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.ScheduleCatalogResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.ScheduleRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.ScheduleResponse;
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
@RequestMapping("/api/horarios")
public class ScheduleController {

    private final ManageSchedulesUseCase manageSchedulesUseCase;

    public ScheduleController(ManageSchedulesUseCase manageSchedulesUseCase) {
        this.manageSchedulesUseCase = manageSchedulesUseCase;
    }

    @GetMapping("/catalogo")
    public ScheduleCatalogResponse catalog() {
        return ScheduleCatalogResponse.fromDomain(manageSchedulesUseCase.getCatalog());
    }

    @GetMapping
    public List<ScheduleResponse> findByCourse(@RequestParam Long courseId) {
        return manageSchedulesUseCase.findByCourse(courseId).stream()
                .map(ScheduleResponse::fromDomain)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduleResponse create(@Valid @RequestBody ScheduleRequest request) {
        return ScheduleResponse.fromDomain(
                manageSchedulesUseCase.create(
                        request.courseId(),
                        request.subjectId(),
                        request.teacherId(),
                        request.blockId(),
                        request.room()
                )
        );
    }

    @PutMapping("/{scheduleId}")
    public ScheduleResponse update(@PathVariable Long scheduleId, @Valid @RequestBody ScheduleRequest request) {
        return ScheduleResponse.fromDomain(
                manageSchedulesUseCase.update(
                        scheduleId,
                        request.courseId(),
                        request.subjectId(),
                        request.teacherId(),
                        request.blockId(),
                        request.room()
                )
        );
    }

    @DeleteMapping("/{scheduleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long scheduleId) {
        manageSchedulesUseCase.delete(scheduleId);
    }
}
