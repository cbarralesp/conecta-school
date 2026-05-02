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
        if (!"openai".equalsIgnoreCase(aiProperties.provider())) {
            return Optional.empty();
        }

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

            return Optional.of(parseSuggestion(content, aiProperties.openai().model()));
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

    private String buildRequestBody(PlanningClassSuggestionCommand command) throws IOException {
        String systemInstruction = """
                Eres un experto en planificacion de clases chilenas alineadas a las Bases Curriculares MINEDUC.
                Responde siempre en espanol claro para docentes chilenos.
                Debes devolver solo JSON valido, sin markdown ni texto adicional.
                """;

        String userPrompt = """
                Genera una sugerencia breve y util para una clase escolar chilena.

                Contexto:
                - Asignatura: %s
                - Curso: %s
                - OA: %s
                - Tipo OA: %s
                - Eje: %s
                - Descripcion OA: %s
                - Subitems oficiales: %s

                Devuelve exactamente este JSON:
                {
                  "title": "titulo breve de la clase",
                  "objectiveSummary": "resumen del objetivo de la clase",
                  "startActivity": "inicio de la clase, 2 a 4 oraciones",
                  "developmentActivity": "desarrollo de la clase, pasos concretos",
                  "closingActivity": "cierre de la clase, 2 a 4 oraciones",
                  "diversitySupport": "una adaptacion concreta para NEE/PIE",
                  "statusMessage": "mensaje breve indicando que la sugerencia fue generada a partir del OA"
                }
                """.formatted(
                safe(command.subjectName()),
                safe(command.courseName()),
                safe(command.objectiveCode()),
                safe(command.objectiveType()),
                safe(command.objectiveAxis()),
                safe(command.objectiveDescription()),
                command.subItems() == null || command.subItems().isEmpty() ? "sin subitems oficiales" : String.join("; ", command.subItems())
        );

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

    private PlanningClassSuggestion parseSuggestion(String content, String model) throws IOException {
        String cleaned = stripMarkdown(content);
        JsonNode root = objectMapper.readTree(cleaned);

        return new PlanningClassSuggestion(
                root.path("title").asText("Clase sugerida"),
                root.path("objectiveSummary").asText("Sugerencia generada a partir del OA seleccionado."),
                root.path("startActivity").asText(""),
                root.path("developmentActivity").asText(""),
                root.path("closingActivity").asText(""),
                root.path("diversitySupport").asText(""),
                root.path("statusMessage").asText("Sugerencia generada con OpenAI."),
                "OPENAI:" + model
        );
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
}
