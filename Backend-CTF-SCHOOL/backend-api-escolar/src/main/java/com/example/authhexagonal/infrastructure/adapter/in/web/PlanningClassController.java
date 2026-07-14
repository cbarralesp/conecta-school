package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.PlanningClassCommand;
import com.example.authhexagonal.domain.model.PlanningClassObjectiveSelection;
import com.example.authhexagonal.domain.model.PlanningClassDocumentUploadCommand;
import com.example.authhexagonal.domain.model.PlanningClassSuggestionCommand;
import com.example.authhexagonal.domain.model.PlanningClassStatus;
import com.example.authhexagonal.domain.model.PlanningDocumentFileType;
import com.example.authhexagonal.domain.port.in.AttachPlanningClassDocumentUseCase;
import com.example.authhexagonal.domain.port.in.CreatePlanningClassUseCase;
import com.example.authhexagonal.domain.port.in.DeletePlanningClassUseCase;
import com.example.authhexagonal.domain.port.in.GeneratePlanningClassSuggestionUseCase;
import com.example.authhexagonal.domain.port.in.GetPlanningClassUseCase;
import com.example.authhexagonal.domain.port.in.GetPlanningClassCatalogsUseCase;
import com.example.authhexagonal.domain.port.in.ListPlanningClassesUseCase;
import com.example.authhexagonal.domain.port.in.RemovePlanningClassDocumentUseCase;
import com.example.authhexagonal.domain.port.in.SavePlanningClassDraftUseCase;
import com.example.authhexagonal.domain.port.in.UpdatePlanningClassUseCase;
import com.example.authhexagonal.domain.port.in.UpdatePlanningClassTitleUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassCatalogsResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassCreateRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassDocumentResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassDraftRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningAiStatusResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassSuggestionRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassSuggestionResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassTitleUpdateRequest;
import com.example.authhexagonal.infrastructure.config.AiProperties;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/planning/classes")
public class PlanningClassController {

    private final GetPlanningClassCatalogsUseCase getPlanningClassCatalogsUseCase;
    private final GetPlanningClassUseCase getPlanningClassUseCase;
    private final ListPlanningClassesUseCase listPlanningClassesUseCase;
    private final CreatePlanningClassUseCase createPlanningClassUseCase;
    private final SavePlanningClassDraftUseCase savePlanningClassDraftUseCase;
    private final DeletePlanningClassUseCase deletePlanningClassUseCase;
    private final GeneratePlanningClassSuggestionUseCase generatePlanningClassSuggestionUseCase;
    private final AttachPlanningClassDocumentUseCase attachPlanningClassDocumentUseCase;
    private final RemovePlanningClassDocumentUseCase removePlanningClassDocumentUseCase;
    private final UpdatePlanningClassUseCase updatePlanningClassUseCase;
    private final UpdatePlanningClassTitleUseCase updatePlanningClassTitleUseCase;
    private final AiProperties aiProperties;

    public PlanningClassController(
            GetPlanningClassCatalogsUseCase getPlanningClassCatalogsUseCase,
            GetPlanningClassUseCase getPlanningClassUseCase,
            ListPlanningClassesUseCase listPlanningClassesUseCase,
            CreatePlanningClassUseCase createPlanningClassUseCase,
            SavePlanningClassDraftUseCase savePlanningClassDraftUseCase,
            DeletePlanningClassUseCase deletePlanningClassUseCase,
            GeneratePlanningClassSuggestionUseCase generatePlanningClassSuggestionUseCase,
            AttachPlanningClassDocumentUseCase attachPlanningClassDocumentUseCase,
            RemovePlanningClassDocumentUseCase removePlanningClassDocumentUseCase,
            UpdatePlanningClassUseCase updatePlanningClassUseCase,
            UpdatePlanningClassTitleUseCase updatePlanningClassTitleUseCase,
            AiProperties aiProperties
    ) {
        this.getPlanningClassCatalogsUseCase = getPlanningClassCatalogsUseCase;
        this.getPlanningClassUseCase = getPlanningClassUseCase;
        this.listPlanningClassesUseCase = listPlanningClassesUseCase;
        this.createPlanningClassUseCase = createPlanningClassUseCase;
        this.savePlanningClassDraftUseCase = savePlanningClassDraftUseCase;
        this.deletePlanningClassUseCase = deletePlanningClassUseCase;
        this.generatePlanningClassSuggestionUseCase = generatePlanningClassSuggestionUseCase;
        this.attachPlanningClassDocumentUseCase = attachPlanningClassDocumentUseCase;
        this.removePlanningClassDocumentUseCase = removePlanningClassDocumentUseCase;
        this.updatePlanningClassUseCase = updatePlanningClassUseCase;
        this.updatePlanningClassTitleUseCase = updatePlanningClassTitleUseCase;
        this.aiProperties = aiProperties;
    }

    @GetMapping("/catalogs")
    public PlanningClassCatalogsResponse getCatalogs(Authentication authentication) {
        return PlanningClassCatalogsResponse.fromDomain(
                getPlanningClassCatalogsUseCase.getCatalogs(authentication.getName())
        );
    }

    @GetMapping
    public java.util.List<PlanningClassResponse> list(
            Authentication authentication,
            @RequestParam(name = "year", required = false) Integer year,
            @RequestParam(name = "courseId", required = false) Long courseId,
            @RequestParam(name = "subjectId", required = false) Long subjectId,
            @RequestParam(name = "semester", required = false) Integer semester,
            @RequestParam(name = "month", required = false) Integer month,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "documentType", required = false) String documentType,
            @RequestParam(name = "search", required = false) String search
    ) {
        return listPlanningClassesUseCase.listClasses(
                        authentication.getName(),
                        year,
                        courseId,
                        subjectId,
                        semester,
                        month,
                        parseStatus(status),
                        parseDocumentType(documentType),
                        search
                ).stream()
                .map(PlanningClassResponse::fromDomain)
                .toList();
    }

    @GetMapping("/ai-status")
    public PlanningAiStatusResponse getAiStatus() {
        return PlanningAiStatusResponse.from(aiProperties);
    }

    @GetMapping("/{classId}")
    public PlanningClassResponse getById(
            Authentication authentication,
            @PathVariable("classId") Long classId
    ) {
        return PlanningClassResponse.fromDomain(
                getPlanningClassUseCase.getClass(authentication.getName(), classId)
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlanningClassResponse create(
            Authentication authentication,
            @Valid @RequestBody PlanningClassCreateRequest request
    ) {
        return PlanningClassResponse.fromDomain(
                createPlanningClassUseCase.createClass(authentication.getName(), toCommand(request))
        );
    }

    @PostMapping("/draft")
    @ResponseStatus(HttpStatus.CREATED)
    public PlanningClassResponse saveDraft(
            Authentication authentication,
            @Valid @RequestBody PlanningClassDraftRequest request
    ) {
        return PlanningClassResponse.fromDomain(
                savePlanningClassDraftUseCase.saveDraft(authentication.getName(), toCommand(request))
        );
    }

    @PutMapping("/{classId}")
    public PlanningClassResponse updateTitle(
            Authentication authentication,
            @PathVariable("classId") Long classId,
            @Valid @RequestBody PlanningClassTitleUpdateRequest request
    ) {
        return PlanningClassResponse.fromDomain(
                updatePlanningClassTitleUseCase.updateTitle(authentication.getName(), classId, request.title())
        );
    }

    @PutMapping("/{classId}/details")
    public PlanningClassResponse updateDetails(
            Authentication authentication,
            @PathVariable("classId") Long classId,
            @Valid @RequestBody PlanningClassCreateRequest request
    ) {
        return PlanningClassResponse.fromDomain(
                updatePlanningClassUseCase.updateClass(authentication.getName(), classId, toCommand(request))
        );
    }

    @DeleteMapping("/{classId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteClass(
            Authentication authentication,
            @PathVariable("classId") Long classId
    ) {
        deletePlanningClassUseCase.deleteClass(authentication.getName(), classId);
    }

    @PostMapping("/suggestion")
    public PlanningClassSuggestionResponse generateSuggestion(
            Authentication authentication,
            @Valid @RequestBody PlanningClassSuggestionRequest request
    ) {
        return PlanningClassSuggestionResponse.fromDomain(
                generatePlanningClassSuggestionUseCase.generateSuggestion(
                        authentication.getName(),
                        new PlanningClassSuggestionCommand(
                                request.subjectName(),
                                request.courseName(),
                                request.unitName(),
                                request.unitType(),
                                request.durationMinutes(),
                                request.objectiveCode(),
                                request.objectiveDescription(),
                                request.objectiveType(),
                                request.objectiveAxis(),
                                request.subItems(),
                                request.transversalObjectives(),
                                request.evaluationIndicators(),
                                request.selectedObjectives(),
                                request.selectedObjectiveIndicators()
                        )
                )
        );
    }

    @PostMapping(path = "/{classId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PlanningClassDocumentResponse uploadDocument(
            Authentication authentication,
            @PathVariable("classId") Long classId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(name = "visibleToStudents", defaultValue = "false") boolean visibleToStudents
    ) throws IOException {
        return PlanningClassDocumentResponse.fromDomain(
                attachPlanningClassDocumentUseCase.attachDocument(
                        authentication.getName(),
                        classId,
                        new PlanningClassDocumentUploadCommand(
                                file.getOriginalFilename(),
                                file.getContentType(),
                                file.getSize(),
                                file.getBytes(),
                                visibleToStudents
                        )
                )
        );
    }

    @DeleteMapping("/{classId}/documents/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeDocument(
            Authentication authentication,
            @PathVariable("classId") Long classId,
            @PathVariable("documentId") Long documentId
    ) {
        removePlanningClassDocumentUseCase.removeDocument(authentication.getName(), classId, documentId);
    }

    private PlanningClassCommand toCommand(PlanningClassCreateRequest request) {
        return new PlanningClassCommand(
                request.unitId(),
                request.durationCode(),
                request.title(),
                request.plannedDate(),
                request.objectiveCode(),
                request.evaluationType(),
                request.objectiveDescription(),
                request.startActivity(),
                request.developmentActivity(),
                request.closingActivity(),
                request.objectiveIds(),
                mapObjectiveSelections(request.objectiveSelections())
        );
    }

    private PlanningClassCommand toCommand(PlanningClassDraftRequest request) {
        return new PlanningClassCommand(
                request.unitId(),
                request.durationCode(),
                request.title(),
                request.plannedDate(),
                request.objectiveCode(),
                request.evaluationType(),
                request.objectiveDescription(),
                request.startActivity(),
                request.developmentActivity(),
                request.closingActivity(),
                request.objectiveIds(),
                mapObjectiveSelections(request.objectiveSelections())
        );
    }

    private java.util.List<PlanningClassObjectiveSelection> mapObjectiveSelections(
            java.util.List<com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassObjectiveSelectionRequest> selections
    ) {
        if (selections == null || selections.isEmpty()) {
            return java.util.List.of();
        }

        return selections.stream()
                .filter(java.util.Objects::nonNull)
                .map(selection -> new PlanningClassObjectiveSelection(
                        selection.objectiveId(),
                        selection.objectiveCode(),
                        selection.indicators() == null ? java.util.List.of() : selection.indicators()
                ))
                .toList();
    }

    private PlanningDocumentFileType parseDocumentType(String documentType) {
        if (documentType == null || documentType.isBlank()) {
            return null;
        }
        return PlanningDocumentFileType.valueOf(documentType.trim().toUpperCase());
    }

    private PlanningClassStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return PlanningClassStatus.valueOf(status.trim().toUpperCase());
    }
}
