package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.PlanningClassCommand;
import com.example.authhexagonal.domain.model.PlanningClassDocumentUploadCommand;
import com.example.authhexagonal.domain.port.in.AttachPlanningClassDocumentUseCase;
import com.example.authhexagonal.domain.port.in.CreatePlanningClassUseCase;
import com.example.authhexagonal.domain.port.in.GetPlanningClassCatalogsUseCase;
import com.example.authhexagonal.domain.port.in.RemovePlanningClassDocumentUseCase;
import com.example.authhexagonal.domain.port.in.SavePlanningClassDraftUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassCatalogsResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassCreateRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassDocumentResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassDraftRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningClassResponse;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/planning/classes")
public class PlanningClassController {

    private final GetPlanningClassCatalogsUseCase getPlanningClassCatalogsUseCase;
    private final CreatePlanningClassUseCase createPlanningClassUseCase;
    private final SavePlanningClassDraftUseCase savePlanningClassDraftUseCase;
    private final AttachPlanningClassDocumentUseCase attachPlanningClassDocumentUseCase;
    private final RemovePlanningClassDocumentUseCase removePlanningClassDocumentUseCase;

    public PlanningClassController(
            GetPlanningClassCatalogsUseCase getPlanningClassCatalogsUseCase,
            CreatePlanningClassUseCase createPlanningClassUseCase,
            SavePlanningClassDraftUseCase savePlanningClassDraftUseCase,
            AttachPlanningClassDocumentUseCase attachPlanningClassDocumentUseCase,
            RemovePlanningClassDocumentUseCase removePlanningClassDocumentUseCase
    ) {
        this.getPlanningClassCatalogsUseCase = getPlanningClassCatalogsUseCase;
        this.createPlanningClassUseCase = createPlanningClassUseCase;
        this.savePlanningClassDraftUseCase = savePlanningClassDraftUseCase;
        this.attachPlanningClassDocumentUseCase = attachPlanningClassDocumentUseCase;
        this.removePlanningClassDocumentUseCase = removePlanningClassDocumentUseCase;
    }

    @GetMapping("/catalogs")
    public PlanningClassCatalogsResponse getCatalogs(Authentication authentication) {
        return PlanningClassCatalogsResponse.fromDomain(
                getPlanningClassCatalogsUseCase.getCatalogs(authentication.getName())
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

    @PostMapping(path = "/{classId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PlanningClassDocumentResponse uploadDocument(
            Authentication authentication,
            @PathVariable Long classId,
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
            @PathVariable Long classId,
            @PathVariable Long documentId
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
                request.closingActivity()
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
                request.closingActivity()
        );
    }
}
