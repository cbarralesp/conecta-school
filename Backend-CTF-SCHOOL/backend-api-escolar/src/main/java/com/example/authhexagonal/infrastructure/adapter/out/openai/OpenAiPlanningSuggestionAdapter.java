package com.example.authhexagonal.infrastructure.adapter.out.openai;

import com.example.authhexagonal.domain.exception.AiSuggestionUnavailableException;
import com.example.authhexagonal.domain.model.PlanningClassSuggestion;
import com.example.authhexagonal.domain.model.PlanningClassSuggestionCommand;
import com.example.authhexagonal.domain.port.out.GeneratePlanningClassSuggestionPort;
import com.example.authhexagonal.infrastructure.config.AiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;

@Component
public class OpenAiPlanningSuggestionAdapter implements GeneratePlanningClassSuggestionPort {

    private static final Logger LOGGER = LoggerFactory.getLogger(OpenAiPlanningSuggestionAdapter.class);

    private final AiProperties aiProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public OpenAiPlanningSuggestionAdapter(AiProperties aiProperties) {
        this.aiProperties = aiProperties;
        this.objectMapper = new ObjectMapper();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(aiProperties.openai().timeoutSeconds()))
                .build();
    }

    @Override
    public Optional<PlanningClassSuggestion> generateSuggestion(PlanningClassSuggestionCommand command) {
        return switch (aiProperties.provider()) {
            case "openai" -> Optional.of(requestOpenAiSuggestion(command));
            case "gemini" -> Optional.of(requestGeminiSuggestion(command));
            case "deepseek" -> Optional.of(requestDeepSeekSuggestion(command));
            default -> Optional.empty();
        };
    }

    private PlanningClassSuggestion requestOpenAiSuggestion(PlanningClassSuggestionCommand command) {
        String apiKey = aiProperties.openai().apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new AiSuggestionUnavailableException(
                    "OPENAI_MISSING_API_KEY",
                    "OpenAI suggestion skipped because OPENAI_API_KEY is not configured."
            );
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(aiProperties.openai().baseUrl() + "/responses"))
                    .timeout(Duration.ofSeconds(aiProperties.openai().timeoutSeconds()))
                    .header("Authorization", "Bearer " + apiKey.trim())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(buildRequestBody(command)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOGGER.warn("OpenAI suggestion request failed with status {} and body {}", response.statusCode(), response.body());
                throw buildUnavailableException(response.statusCode(), response.body());
            }

            String content = extractOutputText(response.body());
            if (content == null || content.isBlank()) {
                LOGGER.warn("OpenAI suggestion response did not contain readable text.");
                throw new AiSuggestionUnavailableException(
                        "OPENAI_EMPTY_RESPONSE",
                        "OpenAI suggestion response did not contain readable text."
                );
            }

            return parseSuggestion(content, "OPENAI:" + aiProperties.openai().model());
        } catch (AiSuggestionUnavailableException exception) {
            throw exception;
        } catch (Exception exception) {
            LOGGER.warn("OpenAI suggestion fallback activated: {}", exception.getMessage());
            throw new AiSuggestionUnavailableException(
                    "OPENAI_REQUEST_FAILED",
                    exception.getMessage() == null ? "OpenAI request failed." : exception.getMessage()
            );
        }
    }

    private PlanningClassSuggestion requestGeminiSuggestion(PlanningClassSuggestionCommand command) {
        String apiKey = aiProperties.gemini().apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new AiSuggestionUnavailableException(
                    "GEMINI_MISSING_API_KEY",
                    "Gemini suggestion skipped because GEMINI_API_KEY is not configured."
            );
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(aiProperties.gemini().baseUrl() + "/models/" + aiProperties.gemini().model() + ":generateContent"))
                    .timeout(Duration.ofSeconds(aiProperties.gemini().timeoutSeconds()))
                    .header("x-goog-api-key", apiKey.trim())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(buildGeminiRequestBody(command)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOGGER.warn("Gemini suggestion request failed with status {} and body {}", response.statusCode(), response.body());
                throw buildGeminiUnavailableException(response.statusCode(), response.body());
            }

            String content = extractGeminiOutputText(response.body());
            if (content == null || content.isBlank()) {
                LOGGER.warn("Gemini suggestion response did not contain readable text.");
                throw new AiSuggestionUnavailableException(
                        "GEMINI_EMPTY_RESPONSE",
                        "Gemini suggestion response did not contain readable text."
                );
            }

            return parseSuggestion(content, "GEMINI:" + aiProperties.gemini().model());
        } catch (AiSuggestionUnavailableException exception) {
            throw exception;
        } catch (Exception exception) {
            LOGGER.warn("Gemini suggestion fallback activated: {}", exception.getMessage());
            throw new AiSuggestionUnavailableException(
                    "GEMINI_REQUEST_FAILED",
                    exception.getMessage() == null ? "Gemini request failed." : exception.getMessage()
            );
        }
    }

    private PlanningClassSuggestion requestDeepSeekSuggestion(PlanningClassSuggestionCommand command) {
        String apiKey = aiProperties.deepseek().apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new AiSuggestionUnavailableException(
                    "DEEPSEEK_MISSING_API_KEY",
                    "DeepSeek suggestion skipped because DEEPSEEK_API_KEY is not configured."
            );
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(aiProperties.deepseek().baseUrl() + "/chat/completions"))
                    .timeout(Duration.ofSeconds(aiProperties.deepseek().timeoutSeconds()))
                    .header("Authorization", "Bearer " + apiKey.trim())
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .header("Accept", "application/json; charset=UTF-8")
                    .POST(HttpRequest.BodyPublishers.ofString(buildDeepSeekRequestBody(command), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOGGER.warn("DeepSeek suggestion request failed with status {} and body {}", response.statusCode(), response.body());
                throw buildDeepSeekUnavailableException(response.statusCode(), response.body());
            }

            String content = extractDeepSeekOutputText(response.body());
            if (content == null || content.isBlank()) {
                LOGGER.warn("DeepSeek suggestion response did not contain readable text.");
                throw new AiSuggestionUnavailableException(
                        "DEEPSEEK_EMPTY_RESPONSE",
                        "DeepSeek suggestion response did not contain readable text."
                );
            }

            return parseSuggestion(content, "DEEPSEEK:" + aiProperties.deepseek().model());
        } catch (AiSuggestionUnavailableException exception) {
            throw exception;
        } catch (Exception exception) {
            LOGGER.warn("DeepSeek suggestion fallback activated: {}", exception.getMessage());
            throw new AiSuggestionUnavailableException(
                    "DEEPSEEK_REQUEST_FAILED",
                    exception.getMessage() == null ? "DeepSeek request failed." : exception.getMessage()
            );
        }
    }

    private AiSuggestionUnavailableException buildUnavailableException(int statusCode, String body) {
        String normalizedBody = body == null ? "" : body.toLowerCase(java.util.Locale.ROOT);
        if (statusCode == 429 && normalizedBody.contains("insufficient_quota")) {
            return new AiSuggestionUnavailableException(
                    "OPENAI_INSUFFICIENT_QUOTA",
                    "OpenAI quota exceeded for the current project."
            );
        }
        if (statusCode == 401) {
            return new AiSuggestionUnavailableException(
                    "OPENAI_UNAUTHORIZED",
                    "OpenAI rejected the API key."
            );
        }
        return new AiSuggestionUnavailableException(
                "OPENAI_HTTP_" + statusCode,
                "OpenAI request failed with status " + statusCode + "."
        );
    }

    private AiSuggestionUnavailableException buildGeminiUnavailableException(int statusCode, String body) {
        String normalizedBody = body == null ? "" : body.toLowerCase(java.util.Locale.ROOT);
        if (statusCode == 429 || normalizedBody.contains("quota")) {
            return new AiSuggestionUnavailableException(
                    "GEMINI_INSUFFICIENT_QUOTA",
                    "Gemini quota exceeded for the current project."
            );
        }
        if (statusCode == 401 || statusCode == 403) {
            return new AiSuggestionUnavailableException(
                    "GEMINI_UNAUTHORIZED",
                    "Gemini rejected the API key."
            );
        }
        return new AiSuggestionUnavailableException(
                "GEMINI_HTTP_" + statusCode,
                "Gemini request failed with status " + statusCode + "."
        );
    }

    private AiSuggestionUnavailableException buildDeepSeekUnavailableException(int statusCode, String body) {
        String normalizedBody = body == null ? "" : body.toLowerCase(java.util.Locale.ROOT);
        if (statusCode == 402 || statusCode == 429 || normalizedBody.contains("quota") || normalizedBody.contains("insufficient")) {
            return new AiSuggestionUnavailableException(
                    "DEEPSEEK_INSUFFICIENT_QUOTA",
                    "DeepSeek quota exceeded for the current project."
            );
        }
        if (statusCode == 401 || statusCode == 403) {
            return new AiSuggestionUnavailableException(
                    "DEEPSEEK_UNAUTHORIZED",
                    "DeepSeek rejected the API key."
            );
        }
        return new AiSuggestionUnavailableException(
                "DEEPSEEK_HTTP_" + statusCode,
                "DeepSeek request failed with status " + statusCode + "."
        );
    }

    private String buildRequestBody(PlanningClassSuggestionCommand command) throws IOException {
        String systemInstruction = buildBaseSystemInstruction();

        String userPrompt = buildSuggestionInstruction(command);

        JsonNode payload = objectMapper.createObjectNode()
                .put("model", aiProperties.openai().model())
                .set("input", objectMapper.createArrayNode()
                        .add(objectMapper.createObjectNode()
                                .put("role", "system")
                                .set("content", objectMapper.createArrayNode()
                                        .add(objectMapper.createObjectNode()
                                                .put("type", "input_text")
                                                .put("text", systemInstruction))))
                        .add(objectMapper.createObjectNode()
                                .put("role", "user")
                                .set("content", objectMapper.createArrayNode()
                                        .add(objectMapper.createObjectNode()
                                                .put("type", "input_text")
                                                .put("text", userPrompt)))));

        return objectMapper.writeValueAsString(payload);
    }

    private String buildGeminiRequestBody(PlanningClassSuggestionCommand command) throws IOException {
        String instruction = buildBaseSystemInstruction() + "\n\n" + buildSuggestionInstruction(command);

        JsonNode payload = objectMapper.createObjectNode()
                .set("contents", objectMapper.createArrayNode()
                        .add(objectMapper.createObjectNode()
                                .set("parts", objectMapper.createArrayNode()
                                        .add(objectMapper.createObjectNode().put("text", instruction)))));

        return objectMapper.writeValueAsString(payload);
    }

    private String buildDeepSeekRequestBody(PlanningClassSuggestionCommand command) throws IOException {
        String systemInstruction = buildBaseSystemInstruction();

        String userPrompt = buildSuggestionInstruction(command);

        com.fasterxml.jackson.databind.node.ObjectNode payload = objectMapper.createObjectNode();
        payload.put("model", aiProperties.deepseek().model());
        payload.set("messages", objectMapper.createArrayNode()
                .add(objectMapper.createObjectNode()
                        .put("role", "system")
                        .put("content", systemInstruction))
                .add(objectMapper.createObjectNode()
                        .put("role", "user")
                        .put("content", userPrompt)));
        payload.put("stream", false);

        return objectMapper.writeValueAsString(payload);
    }

    private String buildBaseSystemInstruction() {
        return """
                Eres un docente experto en planificacion de clases chilenas alineadas a las Bases Curriculares MINEDUC.
                Responde siempre en espanol claro, natural y profesional para docentes chilenos.
                Devuelves unicamente JSON valido, sin markdown ni texto adicional.
                Antes de responder, verifica que los minutos de inicio, desarrollo y cierre sumen exactamente el total solicitado.
                """;
    }

    private String buildSuggestionInstruction(PlanningClassSuggestionCommand command) {
        TimeDistribution timeDistribution = buildTimeDistribution(command);
        String primaryIndicatorsBlock = buildPrimaryIndicatorsBlock(command.evaluationIndicators());
        String secondaryObjectivesBlock = buildSecondaryObjectivesBlock(
                command.selectedObjectives(),
                command.selectedObjectiveIndicators()
        );
        String transversalObjectivesBlock = buildTransversalObjectivesBlock(command.transversalObjectives());

        return """
                Genera una sugerencia breve, util y aplicable para una clase escolar chilena real.

                Datos de la clase:
                - Asignatura: %s
                - Curso: %s
                - Unidad: %s
                - Tipo de unidad: %s
                - Duracion total de la clase en minutos: %s
                - OA principal: %s
                - Tipo OA: %s
                - Eje: %s
                - Descripcion OA: %s
                - Subitems oficiales: %s
                %s
                %s
                %s

                Instrucciones pedagogicas obligatorias:
                - Basa toda la sugerencia en el OA principal entregado.
                - Considera la unidad como marco tematico obligatorio de la clase.
                - Los OA transversales son solo apoyo complementario, no el foco.
                - CADA indicador seleccionado debe verse reflejado EXPLICITAMENTE en al menos una actividad o evidencia observable.
                - La evaluacion debe describir exactamente que evidencia observara el docente para cada indicador seleccionado (no en general).
                - Usa actividades realistas para una sala de clases chilena, adecuadas para la edad del curso.
                - No inventes OA adicionales fuera de los entregados.
                - No mezcles asignaturas ni recursos imposibles para el nivel.
                - Usa un lenguaje pedagogico claro, concreto y aplicable por el docente.
                - diversitySupport debe ser especifico para el nivel %s e incluir al menos una estrategia concreta para estudiantes con dificultades y una para estudiantes avanzados.

                Distribucion de tiempo obligatoria:
                - Inicio: %s min exactos
                - Desarrollo: %s min exactos
                - Cierre: %s min exactos
                - TOTAL: %s min exactos
                - startActivity DEBE comenzar con "(%s min)"
                - developmentActivity DEBE comenzar con "(%s min)"
                - closingActivity DEBE comenzar con "(%s min)"
                - Verifica antes de responder que %s + %s + %s = %s

                Restricciones de formato:
                - El titulo debe reflejar el OA principal y el contexto de la unidad.
                - objectiveSummary debe mencionar los indicadores que se trabajaran.
                - startActivity debe activar conocimientos previos sobre el tema del OA.
                - developmentActivity debe ser la actividad central donde se prioriza el OA principal y se evidencian los indicadores seleccionados.
                - closingActivity debe permitir al docente verificar el logro de al menos un indicador mediante una evidencia observable, pregunta guiada, produccion o lista de cotejo breve.
                - indicatorsCovered debe listar textualmente los indicadores trabajados.

                Devuelve exactamente este JSON:
                {
                  "title": "Titulo claro que refleje el OA y la unidad",
                  "objectiveSummary": "Que aprenderan los estudiantes y que indicadores se trabajaran",
                  "startActivity": "Actividad de inicio con tiempo estimado en minutos",
                  "developmentActivity": "Actividad de desarrollo con tiempo estimado en minutos",
                  "closingActivity": "Actividad de cierre con tiempo estimado en minutos",
                  "indicatorsCovered": ["indicador 1 trabajado", "indicador 2 trabajado"],
                  "diversitySupport": "Estrategia para dificultades y para estudiantes avanzados",
                  "statusMessage": "Mensaje breve de confirmacion para el docente"
                }
                """.formatted(
                safe(command.subjectName()),
                safe(command.courseName()),
                safe(command.unitName()),
                safe(command.unitType()),
                formatDurationMinutes(command.durationMinutes()),
                safe(command.objectiveCode()),
                safe(command.objectiveType()),
                safe(command.objectiveAxis()),
                safe(command.objectiveDescription()),
                formatList(command.subItems(), "sin subitems oficiales"),
                primaryIndicatorsBlock,
                secondaryObjectivesBlock,
                transversalObjectivesBlock,
                safe(command.courseName()),
                String.valueOf(timeDistribution.startMinutes()),
                String.valueOf(timeDistribution.developmentMinutes()),
                String.valueOf(timeDistribution.closingMinutes()),
                String.valueOf(timeDistribution.totalMinutes()),
                String.valueOf(timeDistribution.startMinutes()),
                String.valueOf(timeDistribution.developmentMinutes()),
                String.valueOf(timeDistribution.closingMinutes()),
                String.valueOf(timeDistribution.startMinutes()),
                String.valueOf(timeDistribution.developmentMinutes()),
                String.valueOf(timeDistribution.closingMinutes()),
                String.valueOf(timeDistribution.totalMinutes())
        );
    }

    private String buildPrimaryIndicatorsBlock(java.util.List<String> indicators) {
        java.util.List<String> normalizedIndicators = normalizeValues(indicators);
        if (normalizedIndicators.isEmpty()) {
            return "- Indicadores de evaluacion del OA principal: no se informaron indicadores seleccionados. Disena la clase enfocada en el OA principal sin inventar otros indicadores.";
        }

        if (normalizedIndicators.size() == 1) {
            return """
                    - Indicador de evaluacion del OA principal (trabaja ESTE en profundidad):
                      1. %s
                    - Estrategia obligatoria: el desarrollo debe centrarse en evidenciar este indicador con una actividad principal clara.
                    """.formatted(normalizedIndicators.get(0));
        }

        if (normalizedIndicators.size() <= 3) {
            return """
                    - Indicadores de evaluacion del OA principal (trabaja TODOS):
                    %s
                    - Estrategia obligatoria: distribuye el desarrollo para que cada indicador tenga una evidencia visible dentro de la clase.
                    """.formatted(formatEnumeratedLines(normalizedIndicators, 1));
        }

        return """
                - Indicadores de evaluacion del OA principal (se seleccionaron %s):
                  Priorizacion obligatoria para la clase:
                  Desarrollo central: trabaja en profundidad los 3 primeros indicadores:
                %s
                  Cierre o verificacion final: integra de manera breve los indicadores restantes:
                %s
                - Estrategia obligatoria: el OA principal sigue siendo el foco y no debes intentar dar el mismo peso a todos los indicadores en el desarrollo.
                """.formatted(
                normalizedIndicators.size(),
                indentLines(formatEnumeratedLines(normalizedIndicators.subList(0, 3), 1), 2),
                indentLines(formatEnumeratedLines(normalizedIndicators.subList(3, normalizedIndicators.size()), 4), 2)
        );
    }

    private String buildSecondaryObjectivesBlock(java.util.List<String> secondaryObjectives, java.util.List<String> secondaryIndicators) {
        java.util.List<String> normalizedObjectives = normalizeValues(secondaryObjectives);
        java.util.List<String> normalizedIndicators = normalizeValues(secondaryIndicators);

        if (normalizedObjectives.isEmpty()) {
            return "- Otros OA seleccionados de la clase: ninguno. Toda la clase debe girar en torno al OA principal.";
        }

        if (normalizedObjectives.size() == 1) {
            return """
                    - OA secundario de apoyo (NO es el foco de la clase y debe aparecer como apoyo en una sola actividad o momento):
                      %s
                    - Indicadores asociados a este OA secundario: %s
                    - Regla obligatoria: este OA secundario no puede opacar al OA principal.
                    """.formatted(
                    normalizedObjectives.get(0),
                    normalizedIndicators.isEmpty() ? "sin indicadores adicionales seleccionados" : String.join(" / ", normalizedIndicators)
            );
        }

        return """
                - OA secundarios seleccionados (%s):
                %s
                - Indicadores de los OA secundarios: %s
                - Regla obligatoria: distribuye estos OA secundarios como apoyos puntuales y evita que aparezcan en todos los momentos de la clase.
                """.formatted(
                normalizedObjectives.size(),
                indentLines(formatBulletedLines(normalizedObjectives), 1),
                normalizedIndicators.isEmpty() ? "sin indicadores adicionales seleccionados" : String.join(" / ", normalizedIndicators)
        );
    }

    private String buildTransversalObjectivesBlock(java.util.List<String> transversalObjectives) {
        java.util.List<String> normalizedObjectives = normalizeValues(transversalObjectives);
        if (normalizedObjectives.isEmpty()) {
            return "- OA transversales u objetivos complementarios: ninguno definido.";
        }

        return """
                - OA transversales u objetivos complementarios:
                %s
                - Regla obligatoria: menciona estos objetivos solo si enriquecen naturalmente la clase y no los conviertas en el foco de la evaluacion.
                """.formatted(indentLines(formatBulletedLines(normalizedObjectives), 1));
    }

    private TimeDistribution buildTimeDistribution(PlanningClassSuggestionCommand command) {
        int totalMinutes = parseDurationMinutes(command.durationMinutes());
        int secondaryObjectivesCount = normalizeValues(command.selectedObjectives()).size();
        int primaryIndicatorsCount = normalizeValues(command.evaluationIndicators()).size();
        boolean highComplexity = secondaryObjectivesCount > 1 || primaryIndicatorsCount > 3;

        int startMinutes;
        int closingMinutes;

        if (totalMinutes <= 50) {
            startMinutes = 10;
            closingMinutes = 10;
        } else if (totalMinutes <= 70) {
            startMinutes = 10;
            closingMinutes = highComplexity ? 15 : 10;
        } else if (totalMinutes <= 100) {
            startMinutes = 15;
            closingMinutes = highComplexity ? 20 : 15;
        } else {
            startMinutes = 20;
            closingMinutes = highComplexity ? 20 : 15;
        }

        int developmentMinutes = totalMinutes - startMinutes - closingMinutes;
        if (developmentMinutes < 20) {
            developmentMinutes = Math.max(20, totalMinutes - 20);
            closingMinutes = Math.max(5, totalMinutes - startMinutes - developmentMinutes);
        }

        return new TimeDistribution(startMinutes, developmentMinutes, closingMinutes, totalMinutes);
    }

    private String extractOutputText(String body) throws IOException {
        JsonNode root = objectMapper.readTree(body);
        String outputText = root.path("output_text").asText("");
        if (!outputText.isBlank()) {
            return outputText;
        }

        JsonNode output = root.path("output");
        if (!output.isArray()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        for (JsonNode item : output) {
            JsonNode content = item.path("content");
            if (!content.isArray()) {
                continue;
            }
            for (JsonNode contentItem : content) {
                String text = contentItem.path("text").asText("");
                if (!text.isBlank()) {
                    if (builder.length() > 0) {
                        builder.append('\n');
                    }
                    builder.append(text);
                }
            }
        }
        return builder.toString();
    }

    private String extractGeminiOutputText(String body) throws IOException {
        JsonNode root = objectMapper.readTree(body);
        JsonNode candidates = root.path("candidates");
        if (!candidates.isArray()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        for (JsonNode candidate : candidates) {
            JsonNode parts = candidate.path("content").path("parts");
            if (!parts.isArray()) {
                continue;
            }
            for (JsonNode part : parts) {
                String text = part.path("text").asText("");
                if (!text.isBlank()) {
                    if (builder.length() > 0) {
                        builder.append('\n');
                    }
                    builder.append(text);
                }
            }
        }
        return builder.toString();
    }

    private String extractDeepSeekOutputText(String body) throws IOException {
        String normalizedBody = body;
        if (body != null && (body.contains("Ãƒ") || body.contains("Ã‚"))) {
            try {
                normalizedBody = new String(body.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
            } catch (Exception ignored) {
                normalizedBody = body;
            }
        }

        JsonNode root = objectMapper.readTree(normalizedBody);
        JsonNode choices = root.path("choices");
        if (!choices.isArray()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        for (JsonNode choice : choices) {
            String text = choice.path("message").path("content").asText("");
            if (!text.isBlank()) {
                if (builder.length() > 0) {
                    builder.append('\n');
                }
                builder.append(text);
            }
        }
        return builder.toString();
    }

    private PlanningClassSuggestion parseSuggestion(String content, String providerLabel) throws IOException {
        String cleaned = stripMarkdown(content);
        JsonNode root = objectMapper.readTree(cleaned);

        PlanningClassSuggestion suggestion = new PlanningClassSuggestion(
                normalizeAiText(root.path("title").asText("Clase sugerida")),
                normalizeAiText(root.path("objectiveSummary").asText("Sugerencia generada a partir del OA seleccionado.")),
                normalizeAiText(root.path("startActivity").asText("")),
                normalizeAiText(root.path("developmentActivity").asText("")),
                normalizeAiText(root.path("closingActivity").asText("")),
                parseIndicatorsCovered(root.path("indicatorsCovered")),
                normalizeAiText(root.path("diversitySupport").asText("")),
                normalizeAiText(root.path("statusMessage").asText("Sugerencia generada con IA.")),
                providerLabel
        );

        logSuggestionResult(suggestion);
        return suggestion;
    }

    private String stripMarkdown(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```json", "")
                    .replaceFirst("^```", "");
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3);
            }
        }
        return trimmed.trim();
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private int parseDurationMinutes(Integer durationMinutes) {
        if (durationMinutes == null || durationMinutes <= 0) {
            return 90;
        }
        return durationMinutes;
    }

    private String formatList(java.util.List<String> values, String emptyValue) {
        if (values == null || values.isEmpty()) {
            return emptyValue;
        }
        String joined = values.stream()
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .reduce((left, right) -> left + "; " + right)
                .orElse("");
        return joined.isBlank() ? emptyValue : joined;
    }

    private String formatDurationMinutes(Integer durationMinutes) {
        return String.valueOf(parseDurationMinutes(durationMinutes));
    }

    private java.util.List<String> normalizeValues(java.util.List<String> values) {
        if (values == null || values.isEmpty()) {
            return java.util.List.of();
        }

        return values.stream()
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
    }

    private String formatEnumeratedLines(java.util.List<String> values, int startIndex) {
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < values.size(); index++) {
            if (builder.length() > 0) {
                builder.append('\n');
            }
            builder.append(startIndex + index)
                    .append(". ")
                    .append(values.get(index));
        }
        return builder.toString();
    }

    private String formatBulletedLines(java.util.List<String> values) {
        StringBuilder builder = new StringBuilder();
        for (String value : values) {
            if (builder.length() > 0) {
                builder.append('\n');
            }
            builder.append("- ").append(value);
        }
        return builder.toString();
    }

    private String indentLines(String value, int level) {
        if (value == null || value.isBlank()) {
            return "";
        }

        String indent = "  ".repeat(Math.max(0, level));
        return java.util.Arrays.stream(value.split("\\R"))
                .map(line -> indent + line)
                .reduce((left, right) -> left + "\n" + right)
                .orElse("");
    }

    private void logSuggestionResult(PlanningClassSuggestion suggestion) {
        LOGGER.info(
                "AI planning suggestion generated | providerUsed={} | title={} | objectiveSummary={} | statusMessage={}",
                suggestion.providerUsed(),
                suggestion.title(),
                suggestion.objectiveSummary(),
                suggestion.statusMessage()
        );
    }

    private String normalizeAiText(String value) {
        if (value == null || value.isBlank()) {
            return value == null ? "" : value;
        }

        String normalized = value
                .replace("Ã¡", "á")
                .replace("Ã©", "é")
                .replace("Ã­", "í")
                .replace("Ã³", "ó")
                .replace("Ãº", "ú")
                .replace("Ã", "Á")
                .replace("Ã‰", "É")
                .replace("Ã", "Í")
                .replace("Ã“", "Ó")
                .replace("Ãš", "Ú")
                .replace("Ã±", "ñ")
                .replace("Ã‘", "Ñ")
                .replace("Ã¼", "ü")
                .replace("Â¿", "¿")
                .replace("Â¡", "¡")
                .replace("Â°", "°");

        if (normalized.contains("Ã") || normalized.contains("Â")) {
            try {
                String repaired = new String(normalized.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
                if (!repaired.isBlank()) {
                    normalized = repaired;
                }
            } catch (Exception ignored) {
                // Keep the best-effort replacements if charset repair fails.
            }
        }

        return normalized.trim();
    }

    private java.util.List<String> parseIndicatorsCovered(JsonNode node) {
        if (!node.isArray()) {
            return java.util.List.of();
        }
        java.util.List<String> values = new java.util.ArrayList<>();
        for (JsonNode item : node) {
            String value = normalizeAiText(item.asText(""));
            if (!value.isBlank()) {
                values.add(value);
            }
        }
        return values;
    }

    private record TimeDistribution(int startMinutes, int developmentMinutes, int closingMinutes, int totalMinutes) {
    }
}
