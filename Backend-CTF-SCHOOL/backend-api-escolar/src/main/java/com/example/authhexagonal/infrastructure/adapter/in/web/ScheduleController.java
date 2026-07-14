package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.ManageSchedulesUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.ScheduleCatalogResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.ScheduleBlockCreateRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.ScheduleRowTimeRequest;
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

    @GetMapping({"/catalogo", "/catálogo"})
    public ScheduleCatalogResponse catalog(@RequestParam(required = false) Long courseId) {
        return ScheduleCatalogResponse.fromDomain(manageSchedulesUseCase.getCatalog(courseId));
    }

    @GetMapping
    public List<ScheduleResponse> findByCourse(@RequestParam Long courseId, @RequestParam Long periodId) {
        return manageSchedulesUseCase.findByCourse(courseId, periodId).stream()
                .map(ScheduleResponse::fromDomain)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduleResponse create(@Valid @RequestBody ScheduleRequest request) {
        return ScheduleResponse.fromDomain(
                manageSchedulesUseCase.create(
                        request.periodId(),
                        request.courseId(),
                        request.subjectId(),
                        request.teacherId(),
                        request.blockId(),
                        request.room()
                )
        );
    }

    @PutMapping("/{scheduleId}")
    public ScheduleResponse update(@PathVariable("scheduleId") Long scheduleId, @Valid @RequestBody ScheduleRequest request) {
        return ScheduleResponse.fromDomain(
                manageSchedulesUseCase.update(
                        scheduleId,
                        request.periodId(),
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
    public void delete(@PathVariable("scheduleId") Long scheduleId) {
        manageSchedulesUseCase.delete(scheduleId);
    }

    @PutMapping("/bloques/{order}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateRowTime(@PathVariable int order, @Valid @RequestBody ScheduleRowTimeRequest request) {
        manageSchedulesUseCase.updateRowTime(request.courseId(), order, request.startTime(), request.endTime());
    }

    @PostMapping("/bloques")
    @ResponseStatus(HttpStatus.CREATED)
    public void createRow(@Valid @RequestBody ScheduleBlockCreateRequest request) {
        manageSchedulesUseCase.createRow(request.courseId(), request.startTime(), request.endTime(), request.blockType());
    }

    @PostMapping("/bloques/recreo")
    @ResponseStatus(HttpStatus.CREATED)
    public void createBreakRow(@Valid @RequestBody ScheduleRowTimeRequest request) {
        manageSchedulesUseCase.createBreakRow(request.courseId(), request.startTime(), request.endTime());
    }

    @DeleteMapping("/bloques/{order}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRow(@PathVariable int order, @RequestParam Long courseId) {
        manageSchedulesUseCase.deleteRow(courseId, order);
    }
}
