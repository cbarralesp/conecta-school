package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.ManageActivityCalendarUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.ActivityCalendarResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.CreateSchoolActivityRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.SchoolActivityResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/activities")
public class ActivityCalendarController {

    private final ManageActivityCalendarUseCase manageActivityCalendarUseCase;

    public ActivityCalendarController(ManageActivityCalendarUseCase manageActivityCalendarUseCase) {
        this.manageActivityCalendarUseCase = manageActivityCalendarUseCase;
    }

    @GetMapping("/calendar")
    public ActivityCalendarResponse getCalendar(
            @RequestParam(name = "year", required = false) Integer year,
            @RequestParam(name = "month", required = false) Integer month,
            @RequestParam(name = "courseId", required = false) Long courseId
    ) {
        LocalDate now = LocalDate.now();
        return ActivityCalendarResponse.fromDomain(
                manageActivityCalendarUseCase.getMonthlyCalendar(
                        year == null ? now.getYear() : year,
                        month == null ? now.getMonthValue() : month,
                        courseId
                )
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SchoolActivityResponse createActivity(@Valid @RequestBody CreateSchoolActivityRequest request) {
        return SchoolActivityResponse.fromDomain(
                manageActivityCalendarUseCase.createActivity(
                        request.activityTypeId(),
                        request.courseId(),
                        request.title(),
                        request.description(),
                        request.date(),
                        request.endDate(),
                        request.time(),
                        request.location()
                )
        );
    }

    @PutMapping("/{activityId}")
    public SchoolActivityResponse updateActivity(
            @PathVariable("activityId") Long activityId,
            @Valid @RequestBody CreateSchoolActivityRequest request
    ) {
        return SchoolActivityResponse.fromDomain(
                manageActivityCalendarUseCase.updateActivity(
                        activityId,
                        request.activityTypeId(),
                        request.courseId(),
                        request.title(),
                        request.description(),
                        request.date(),
                        request.endDate(),
                        request.time(),
                        request.location()
                )
        );
    }

    @DeleteMapping("/{activityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteActivity(@PathVariable("activityId") Long activityId) {
        manageActivityCalendarUseCase.deleteActivity(activityId);
    }
}
