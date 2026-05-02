package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.CurriculumGrade;
import com.example.authhexagonal.domain.model.CurriculumObjective;
import com.example.authhexagonal.domain.model.CurriculumSubject;
import com.example.authhexagonal.domain.port.in.GetCurriculumUseCase;
import com.example.authhexagonal.domain.port.out.CurriculumRepository;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class CurriculumService implements GetCurriculumUseCase {

    private final CurriculumRepository curriculumRepository;

    public CurriculumService(CurriculumRepository curriculumRepository) {
        this.curriculumRepository = curriculumRepository;
    }

    @Override
    public List<CurriculumSubject> getAllSubjects() {
        return curriculumRepository.findAllSubjects();
    }

    @Override
    public List<CurriculumGrade> getGradesBySubject(UUID subjectId) {
        return curriculumRepository.findGradesBySubjectId(subjectId);
    }

    @Override
    public List<CurriculumObjective> getObjectivesByGrade(UUID gradeId) {
        return curriculumRepository.findObjectivesByGradeId(gradeId).stream()
                .map(this::enrichObjective)
                .sorted(this::compareObjectives)
                .toList();
    }

    @Override
    public List<CurriculumObjective> searchObjectives(UUID subjectId, String grado, String eje, String tipo) {
        return curriculumRepository.searchObjectives(subjectId, grado, eje, tipo).stream()
                .map(this::enrichObjective)
                .sorted(this::compareObjectives)
                .toList();
    }

    @Override
    public List<CurriculumObjective> getObjectivesByContext(String subjectName, String courseName) {
        return curriculumRepository.findObjectivesByContext(subjectName, courseName).stream()
                .map(this::enrichObjective)
                .sorted(this::compareObjectives)
                .toList();
    }

    private CurriculumObjective enrichObjective(CurriculumObjective objective) {
        String normalizedAxis = normalize(objective.eje());
        String normalizedDescription = normalize(objective.descripcion());
        boolean appreciation = normalizedAxis.contains("apreciar") || normalizedAxis.contains("responder frente al arte");
        boolean skillObjective = "habilidad".equalsIgnoreCase(objective.tipo());
        boolean languageObjective = matchesAny(normalizedDescription, List.of("leer", "texto", "comunicar", "oral"));
        boolean scienceObjective = matchesAny(normalizedDescription, List.of("experiment", "observ", "investig"));
        boolean artObjective = matchesAny(normalizedDescription, List.of("obra", "visual", "color", "textura", "dibu", "pint"));

        Set<String> suggestedSkills = new LinkedHashSet<>();
        if (skillObjective) {
            suggestedSkills.add("Aplicar estrategias");
        }
        if (matchesAny(normalizedAxis, List.of("apreciar", "responder")) || matchesAny(normalizedDescription, List.of("describir", "explicar", "comunicar"))) {
            suggestedSkills.add("Comunicar");
            suggestedSkills.add("Argumentar");
        }
        if (matchesAny(normalizedDescription, List.of("observar", "identificar", "analizar"))) {
            suggestedSkills.add("Observar");
            suggestedSkills.add("Analizar");
        }
        if (matchesAny(normalizedDescription, List.of("crear", "expresar", "aplicar", "experimentar"))) {
            suggestedSkills.add("Crear");
        }
        if (suggestedSkills.isEmpty()) {
            suggestedSkills.add("Crear");
            suggestedSkills.add("Analizar");
        }

        Set<String> suggestedAttitudes = new LinkedHashSet<>();
        if (matchesAny(normalizedAxis, List.of("apreciar", "responder")) || matchesAny(normalizedDescription, List.of("opinion", "impresion", "preferencia"))) {
            suggestedAttitudes.add("Respetar y valorar las ideas y obras de sus companeros.");
        }
        suggestedAttitudes.add("Trabajo colaborativo");
        if (matchesAny(normalizedDescription, List.of("crear", "experimentar", "trabajos de arte"))) {
            suggestedAttitudes.add("Cuidar los materiales y el espacio de trabajo.");
        }
        if (matchesAny(normalizedDescription, List.of("observar", "analizar", "investigar"))) {
            suggestedAttitudes.add("Mantener curiosidad y disposicion para explorar nuevas ideas.");
        }

        Set<String> suggestedResources = new LinkedHashSet<>();
        suggestedResources.add("Guia impresa");
        if (artObjective || matchesAny(normalizedDescription, List.of("imagen", "obra", "visual", "color", "textura"))) {
            suggestedResources.add("Material concreto");
            suggestedResources.add("Proyector");
        }
        if (scienceObjective) {
            suggestedResources.add("Material concreto");
            suggestedResources.add("Video");
        }
        if (languageObjective) {
            suggestedResources.add("Libro de texto");
        }
        if (objective.subItems().stream().map(this::normalize).anyMatch(item -> matchesAny(item, List.of("digital", "tecnolog", "video", "proyector")))) {
            suggestedResources.add("Proyector");
            suggestedResources.add("Video");
        }

        String suggestedInstrument;
        if (appreciation) {
            suggestedInstrument = "Pregunta oral";
        } else if (skillObjective || scienceObjective) {
            suggestedInstrument = "Lista de cotejo";
        } else {
            suggestedInstrument = "Rubrica";
        }

        return new CurriculumObjective(
                objective.id(),
                objective.gradeId(),
                objective.codigo(),
                objective.tipo(),
                objective.eje(),
                objective.descripcion(),
                objective.subItems(),
                limitList(suggestedSkills, 4),
                limitList(suggestedAttitudes, 3),
                new ArrayList<>(suggestedResources),
                buildSuggestedDiversityNote(normalizedDescription),
                "FORMATIVA",
                "Para el aprendizaje",
                suggestedInstrument
        );
    }

    private List<String> limitList(Set<String> values, int limit) {
        return values.stream().limit(limit).toList();
    }

    private String buildSuggestedDiversityNote(String normalizedDescription) {
        if (matchesAny(normalizedDescription, List.of("oral", "comunicar", "explicar", "describir"))) {
            return "Permitir respuestas orales, apoyos visuales y modelado de vocabulario para estudiantes que requieran andamiaje en expresion y comprension.";
        }
        if (matchesAny(normalizedDescription, List.of("crear", "dibujar", "pintar", "modelar", "construir"))) {
            return "Ofrecer materiales adaptados, pasos visuales y opciones de trabajo guiado para estudiantes que requieran apoyo motor, atencional o de organizacion.";
        }
        if (matchesAny(normalizedDescription, List.of("observar", "identificar", "analizar", "investigar"))) {
            return "Entregar instrucciones fragmentadas, ejemplos concretos y acompanamiento por etapas para facilitar la observacion, el registro y la explicacion del aprendizaje.";
        }
        return "Considerar apoyos visuales, consignas breves y alternativas de respuesta oral o practica para estudiantes con NEE o diferenciacion por nivel.";
    }

    private boolean matchesAny(String value, List<String> fragments) {
        return fragments.stream().anyMatch(value::contains);
    }

    private int compareObjectives(CurriculumObjective left, CurriculumObjective right) {
        ObjectiveCodeParts leftParts = parseObjectiveCode(left.codigo());
        ObjectiveCodeParts rightParts = parseObjectiveCode(right.codigo());

        if (!leftParts.prefix().equals(rightParts.prefix())) {
            return leftParts.prefix().compareToIgnoreCase(rightParts.prefix());
        }
        if (leftParts.numeric() != rightParts.numeric()) {
            return Integer.compare(leftParts.numeric(), rightParts.numeric());
        }
        if (leftParts.suffixWeight() != rightParts.suffixWeight()) {
            return Integer.compare(leftParts.suffixWeight(), rightParts.suffixWeight());
        }

        int suffixCompare = leftParts.suffix().compareToIgnoreCase(rightParts.suffix());
        if (suffixCompare != 0) {
            return suffixCompare;
        }

        int axisCompare = String.valueOf(left.eje()).compareToIgnoreCase(String.valueOf(right.eje()));
        if (axisCompare != 0) {
            return axisCompare;
        }

        return String.valueOf(left.descripcion()).compareToIgnoreCase(String.valueOf(right.descripcion()));
    }

    private ObjectiveCodeParts parseObjectiveCode(String code) {
        String normalized = code == null ? "" : code.trim();
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("^([A-Za-z]+)[_\\-]?(\\d+)?([A-Za-z_]*)$")
                .matcher(normalized);

        if (!matcher.matches()) {
            return new ObjectiveCodeParts(normalized, Integer.MAX_VALUE, "", 1);
        }

        String prefix = matcher.group(1) == null ? normalized : matcher.group(1);
        String numericPart = matcher.group(2) == null ? "" : matcher.group(2);
        String suffix = matcher.group(3) == null ? "" : matcher.group(3);

        return new ObjectiveCodeParts(
                prefix,
                numericPart.isBlank() ? Integer.MAX_VALUE : Integer.parseInt(numericPart),
                suffix,
                suffix.isBlank() ? 0 : 1
        );
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("\\s+", " ")
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private record ObjectiveCodeParts(String prefix, int numeric, String suffix, int suffixWeight) {
    }
}
