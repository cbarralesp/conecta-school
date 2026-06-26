package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.PlanningUnitCommand;
import com.example.authhexagonal.domain.port.in.CreatePlanningUnitUseCase;
import com.example.authhexagonal.domain.port.in.DeletePlanningUnitUseCase;
import com.example.authhexagonal.domain.port.in.GetPlanningUnitUseCase;
import com.example.authhexagonal.domain.port.in.GetPlanningUnitCatalogsUseCase;
import com.example.authhexagonal.domain.port.in.GetPlanningUnitsUseCase;
import com.example.authhexagonal.domain.port.in.SavePlanningUnitDraftUseCase;
import com.example.authhexagonal.domain.port.in.UpdatePlanningUnitDetailsUseCase;
import com.example.authhexagonal.domain.port.in.UpdatePlanningUnitUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningUnitCatalogsResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningUnitCreateRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningUnitDraftRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningUnitResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningUnitSummaryResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningUnitUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/planning/units")
public class PlanningUnitController {

    private final GetPlanningUnitCatalogsUseCase getPlanningUnitCatalogsUseCase;
    private final CreatePlanningUnitUseCase createPlanningUnitUseCase;
    private final SavePlanningUnitDraftUseCase savePlanningUnitDraftUseCase;
    private final GetPlanningUnitsUseCase getPlanningUnitsUseCase;
    private final GetPlanningUnitUseCase getPlanningUnitUseCase;
    private final UpdatePlanningUnitUseCase updatePlanningUnitUseCase;
    private final UpdatePlanningUnitDetailsUseCase updatePlanningUnitDetailsUseCase;
    private final DeletePlanningUnitUseCase deletePlanningUnitUseCase;

    public PlanningUnitController(
            GetPlanningUnitCatalogsUseCase getPlanningUnitCatalogsUseCase,
            CreatePlanningUnitUseCase createPlanningUnitUseCase,
            SavePlanningUnitDraftUseCase savePlanningUnitDraftUseCase,
            GetPlanningUnitsUseCase getPlanningUnitsUseCase,
            GetPlanningUnitUseCase getPlanningUnitUseCase,
            UpdatePlanningUnitUseCase updatePlanningUnitUseCase,
            UpdatePlanningUnitDetailsUseCase updatePlanningUnitDetailsUseCase,
            DeletePlanningUnitUseCase deletePlanningUnitUseCase
    ) {
        this.getPlanningUnitCatalogsUseCase = getPlanningUnitCatalogsUseCase;
        this.createPlanningUnitUseCase = createPlanningUnitUseCase;
        this.savePlanningUnitDraftUseCase = savePlanningUnitDraftUseCase;
        this.getPlanningUnitsUseCase = getPlanningUnitsUseCase;
        this.getPlanningUnitUseCase = getPlanningUnitUseCase;
        this.updatePlanningUnitUseCase = updatePlanningUnitUseCase;
        this.updatePlanningUnitDetailsUseCase = updatePlanningUnitDetailsUseCase;
        this.deletePlanningUnitUseCase = deletePlanningUnitUseCase;
    }

    @GetMapping("/catalogs")
    public PlanningUnitCatalogsResponse getCatalogs(Authentication authentication) {
        return PlanningUnitCatalogsResponse.fromDomain(
                getPlanningUnitCatalogsUseCase.getCatalogs(authentication.getName())
        );
    }

    @GetMapping
    public List<PlanningUnitSummaryResponse> findUnits(Authentication authentication) {
        return getPlanningUnitsUseCase.findUnits(authentication.getName()).stream()
                .map(PlanningUnitSummaryResponse::fromDomain)
                .toList();
    }

    @GetMapping("/{unitId}")
    public PlanningUnitResponse getUnit(
            Authentication authentication,
            @PathVariable("unitId") Long unitId
    ) {
        return PlanningUnitResponse.fromDomain(
                getPlanningUnitUseCase.getUnit(authentication.getName(), unitId)
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlanningUnitResponse createUnit(
            Authentication authentication,
            @Valid @RequestBody PlanningUnitCreateRequest request
    ) {
        return PlanningUnitResponse.fromDomain(
                createPlanningUnitUseCase.createUnit(authentication.getName(), toCommand(request))
        );
    }

    @PostMapping("/draft")
    @ResponseStatus(HttpStatus.CREATED)
    public PlanningUnitResponse saveDraft(
            Authentication authentication,
            @Valid @RequestBody PlanningUnitDraftRequest request
    ) {
        return PlanningUnitResponse.fromDomain(
                savePlanningUnitDraftUseCase.saveDraft(authentication.getName(), toCommand(request))
        );
    }

    @PutMapping("/{unitId}")
    public PlanningUnitResponse updateUnit(
            Authentication authentication,
            @PathVariable("unitId") Long unitId,
            @Valid @RequestBody PlanningUnitUpdateRequest request
    ) {
        return PlanningUnitResponse.fromDomain(
                updatePlanningUnitUseCase.updateUnit(authentication.getName(), unitId, request.unitNumber(), request.name())
        );
    }

    @PutMapping("/{unitId}/details")
    public PlanningUnitResponse updateUnitDetails(
            Authentication authentication,
            @PathVariable("unitId") Long unitId,
            @Valid @RequestBody PlanningUnitCreateRequest request
    ) {
        return PlanningUnitResponse.fromDomain(
                updatePlanningUnitDetailsUseCase.updateUnitDetails(authentication.getName(), unitId, toCommand(request))
        );
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{unitId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUnit(
            Authentication authentication,
            @PathVariable("unitId") Long unitId
    ) {
        deletePlanningUnitUseCase.deleteUnit(authentication.getName(), unitId);
    }

    private PlanningUnitCommand toCommand(PlanningUnitCreateRequest request) {
        return new PlanningUnitCommand(
                request.subjectId(),
                request.courseId(),
                request.unitNumber(),
                request.name(),
                request.startWeek(),
                request.startDate(),
                request.endDate(),
                request.estimatedWeeks(),
                request.plannedClasses(),
                request.generalDescription(),
                request.learningObjectives(),
                request.achievementIndicators()
        );
    }

    private PlanningUnitCommand toCommand(PlanningUnitDraftRequest request) {
        return new PlanningUnitCommand(
                request.subjectId(),
                request.courseId(),
                request.unitNumber(),
                request.name(),
                request.startWeek(),
                request.startDate(),
                request.endDate(),
                request.estimatedWeeks(),
                request.plannedClasses(),
                request.generalDescription(),
                request.learningObjectives(),
                request.achievementIndicators()
        );
    }
}
