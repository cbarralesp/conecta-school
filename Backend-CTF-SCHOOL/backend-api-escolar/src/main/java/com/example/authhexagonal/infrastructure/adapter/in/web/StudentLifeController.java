package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.application.service.StudentLifeInterviewPdfService;
import com.example.authhexagonal.domain.model.StudentLifeInterviewCommand;
import com.example.authhexagonal.domain.model.StudentLifeRecordCommand;
import com.example.authhexagonal.domain.port.in.ManageStudentLifeInterviewsUseCase;
import com.example.authhexagonal.domain.port.in.ManageStudentLifeRecordsUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.StudentLifeInterviewRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.StudentLifeInterviewResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.StudentLifeRecordRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.StudentLifeRecordResponse;
import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/hoja-vida")
public class StudentLifeController {

    private final ManageStudentLifeInterviewsUseCase interviewsUseCase;
    private final ManageStudentLifeRecordsUseCase recordsUseCase;
    private final StudentLifeInterviewPdfService interviewPdfService;

    public StudentLifeController(
            ManageStudentLifeInterviewsUseCase interviewsUseCase,
            ManageStudentLifeRecordsUseCase recordsUseCase,
            StudentLifeInterviewPdfService interviewPdfService
    ) {
        this.interviewsUseCase = interviewsUseCase;
        this.recordsUseCase = recordsUseCase;
        this.interviewPdfService = interviewPdfService;
    }

    @GetMapping("/estudiantes/{studentId}/entrevistas")
    public List<StudentLifeInterviewResponse> interviews(@PathVariable("studentId") Long studentId) {
        return interviewsUseCase.findByStudentId(studentId).stream()
                .map(StudentLifeInterviewResponse::fromDomain)
                .toList();
    }

    @PostMapping("/entrevistas")
    @ResponseStatus(HttpStatus.CREATED)
    public StudentLifeInterviewResponse createInterview(@Valid @RequestBody StudentLifeInterviewRequest request) {
        return StudentLifeInterviewResponse.fromDomain(interviewsUseCase.create(toCommand(request)));
    }

    @GetMapping("/entrevistas/{interviewId}")
    public StudentLifeInterviewResponse interview(@PathVariable("interviewId") Long interviewId) {
        return StudentLifeInterviewResponse.fromDomain(interviewsUseCase.findById(interviewId));
    }

    @PutMapping("/entrevistas/{interviewId}")
    public StudentLifeInterviewResponse updateInterview(
            @PathVariable("interviewId") Long interviewId,
            @Valid @RequestBody StudentLifeInterviewRequest request
    ) {
        return StudentLifeInterviewResponse.fromDomain(interviewsUseCase.update(interviewId, toCommand(request)));
    }

    @DeleteMapping("/entrevistas/{interviewId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteInterview(@PathVariable("interviewId") Long interviewId) {
        interviewsUseCase.delete(interviewId);
    }

    @GetMapping("/estudiantes/{studentId}/convivencia")
    public List<StudentLifeRecordResponse> records(@PathVariable("studentId") Long studentId) {
        return recordsUseCase.findByStudentId(studentId).stream()
                .map(StudentLifeRecordResponse::fromDomain)
                .toList();
    }

    @PostMapping("/convivencia")
    @ResponseStatus(HttpStatus.CREATED)
    public StudentLifeRecordResponse createRecord(@Valid @RequestBody StudentLifeRecordRequest request) {
        return StudentLifeRecordResponse.fromDomain(recordsUseCase.create(toCommand(request)));
    }

    @GetMapping("/convivencia/{recordId}")
    public StudentLifeRecordResponse record(@PathVariable("recordId") Long recordId) {
        return StudentLifeRecordResponse.fromDomain(recordsUseCase.findById(recordId));
    }

    @PutMapping("/convivencia/{recordId}")
    public StudentLifeRecordResponse updateRecord(
            @PathVariable("recordId") Long recordId,
            @Valid @RequestBody StudentLifeRecordRequest request
    ) {
        return StudentLifeRecordResponse.fromDomain(recordsUseCase.update(recordId, toCommand(request)));
    }

    @DeleteMapping("/convivencia/{recordId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRecord(@PathVariable("recordId") Long recordId) {
        recordsUseCase.delete(recordId);
    }

    @GetMapping("/entrevistas/{interviewId}/pdf")
    public ResponseEntity<ByteArrayResource> downloadInterviewPdf(@PathVariable("interviewId") Long interviewId) {
        var interview = interviewsUseCase.findById(interviewId);
        byte[] pdf = interviewPdfService.generate(interview);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdf.length)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("acta-entrevista-" + interviewId + ".pdf")
                        .build()
                        .toString())
                .body(new ByteArrayResource(pdf));
    }

    private StudentLifeInterviewCommand toCommand(StudentLifeInterviewRequest request) {
        return new StudentLifeInterviewCommand(
                request.studentId(),
                request.enrollmentId(),
                request.date(),
                request.time(),
                request.type(),
                request.participants(),
                request.reason(),
                request.responsible(),
                request.responsibleRole(),
                request.status(),
                request.summary(),
                request.agreements()
        );
    }

    private StudentLifeRecordCommand toCommand(StudentLifeRecordRequest request) {
        return new StudentLifeRecordCommand(
                request.studentId(),
                request.enrollmentId(),
                request.date(),
                request.time(),
                request.type(),
                request.category(),
                request.area(),
                request.responsible(),
                request.status(),
                request.deadline(),
                request.description()
        );
    }
}
