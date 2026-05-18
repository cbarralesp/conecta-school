package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.StudyProgramDetail;
import com.example.authhexagonal.domain.model.StudyProgramSummary;
import com.example.authhexagonal.domain.port.in.GetStudyProgramsUseCase;
import com.example.authhexagonal.domain.port.out.StudyProgramRepository;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class StudyProgramService implements GetStudyProgramsUseCase {

    private final StudyProgramRepository studyProgramRepository;

    public StudyProgramService(StudyProgramRepository studyProgramRepository) {
        this.studyProgramRepository = studyProgramRepository;
    }

    @Override
    public List<StudyProgramSummary> findPrograms(String subjectName, String grade, String courseName) {
        List<StudyProgramSummary> programs = studyProgramRepository.findAllPrograms();
        if ((subjectName == null || subjectName.isBlank())
                && (grade == null || grade.isBlank())
                && (courseName == null || courseName.isBlank())) {
            return programs;
        }

        Set<String> requestedGradeCodes = new LinkedHashSet<>();
        requestedGradeCodes.addAll(extractGradeCodes(grade));
        requestedGradeCodes.addAll(extractGradeCodes(courseName));

        return programs.stream()
                .filter(program -> matchesSubject(program.subject(), subjectName))
                .filter(program -> matchesGrade(program.grade(), requestedGradeCodes))
                .toList();
    }

    @Override
    public StudyProgramDetail getProgram(Long programId) {
        return studyProgramRepository.findProgramById(programId)
                .orElseThrow(() -> new ResourceNotFoundException("Programa de estudio no encontrado"));
    }

    @Override
    public List<StudyProgramDetail.Unit> getUnits(Long programId) {
        return getProgram(programId).units();
    }

    @Override
    public List<StudyProgramDetail.ObjectiveDetail> getPermanentObjectives(Long programId) {
        return getProgram(programId).permanentObjectives();
    }

    @Override
    public List<StudyProgramDetail.ObjectiveDetail> getUnitObjectives(Long programId, Integer unitNumber) {
        return getProgram(programId).units().stream()
                .filter(unit -> unit.number() != null && unit.number().equals(unitNumber))
                .findFirst()
                .map(StudyProgramDetail.Unit::objectives)
                .orElseThrow(() -> new ResourceNotFoundException("Unidad del programa no encontrada"));
    }

    private boolean matchesSubject(String programSubject, String requestedSubject) {
        if (requestedSubject == null || requestedSubject.isBlank()) {
            return true;
        }
        String normalizedProgram = normalize(programSubject);
        String normalizedRequested = normalize(requestedSubject);
        return normalizedProgram.equals(normalizedRequested)
                || normalizedProgram.contains(normalizedRequested)
                || normalizedRequested.contains(normalizedProgram);
    }

    private boolean matchesGrade(String programGrade, Set<String> requestedGradeCodes) {
        if (requestedGradeCodes.isEmpty()) {
            return true;
        }
        Set<String> programCodes = extractGradeCodes(programGrade);
        return programCodes.stream().anyMatch(requestedGradeCodes::contains);
    }

    private Set<String> extractGradeCodes(String value) {
        Set<String> codes = new LinkedHashSet<>();
        if (value == null || value.isBlank()) {
            return codes;
        }

        String normalized = normalize(value);
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\d+").matcher(normalized);
        while (matcher.find()) {
            codes.add(matcher.group());
        }

        if (normalized.contains("prekinder") || normalized.contains("pre kinder")) {
            codes.add("PK");
        }
        if (normalized.matches(".*\\bkinder\\b.*") && !normalized.contains("prekinder")) {
            codes.add("K");
        }
        if (normalized.contains("medio")) {
            codes = codes.stream()
                    .map(code -> code + "M")
                    .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        }

        return codes;
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[°º]", "")
                .replaceAll("\\s+", " ")
                .trim()
                .toLowerCase(Locale.ROOT);
    }
}
