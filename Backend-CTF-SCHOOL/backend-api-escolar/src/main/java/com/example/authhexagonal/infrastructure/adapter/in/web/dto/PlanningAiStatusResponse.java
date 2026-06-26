package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.infrastructure.config.AiProperties;

public record PlanningAiStatusResponse(
        String configuredProvider,
        String effectiveMode,
        boolean openAiConfigured,
        boolean geminiConfigured,
        boolean deepSeekConfigured,
        boolean ready,
        String model,
        String baseUrl,
        int timeoutSeconds,
        String statusMessage
) {
    public static PlanningAiStatusResponse from(AiProperties aiProperties) {
        boolean providerIsOpenAi = "openai".equalsIgnoreCase(aiProperties.provider());
        boolean providerIsGemini = "gemini".equalsIgnoreCase(aiProperties.provider());
        boolean providerIsDeepSeek = "deepseek".equalsIgnoreCase(aiProperties.provider());
        boolean hasOpenAiKey = aiProperties.openai().apiKey() != null && !aiProperties.openai().apiKey().isBlank();
        boolean hasGeminiKey = aiProperties.gemini().apiKey() != null && !aiProperties.gemini().apiKey().isBlank();
        boolean hasDeepSeekKey = aiProperties.deepseek().apiKey() != null && !aiProperties.deepseek().apiKey().isBlank();
        boolean ready = (providerIsOpenAi && hasOpenAiKey) || (providerIsGemini && hasGeminiKey) || (providerIsDeepSeek && hasDeepSeekKey);
        String effectiveMode = ready
                ? aiProperties.provider().toUpperCase(java.util.Locale.ROOT)
                : "LOCAL_FALLBACK";

        String statusMessage;
        if (ready) {
            statusMessage = "%s listo para sugerencias reales desde el backend."
                    .formatted(providerIsGemini ? "Gemini" : providerIsDeepSeek ? "DeepSeek" : "OpenAI");
        } else if (providerIsOpenAi) {
            statusMessage = "OpenAI esta seleccionado, pero falta OPENAI_API_KEY. Se usara fallback local.";
        } else if (providerIsGemini) {
            statusMessage = "Gemini esta seleccionado, pero falta GEMINI_API_KEY. Se usara fallback local.";
        } else if (providerIsDeepSeek) {
            statusMessage = "DeepSeek esta seleccionado, pero falta DEEPSEEK_API_KEY. Se usara fallback local.";
        } else {
            statusMessage = "El backend esta configurado en modo local. Para usar IA externa, cambia AI_PROVIDER a openai, gemini o deepseek y configura su API key.";
        }

        return new PlanningAiStatusResponse(
                aiProperties.provider(),
                effectiveMode,
                hasOpenAiKey,
                hasGeminiKey,
                hasDeepSeekKey,
                ready,
                providerIsGemini ? aiProperties.gemini().model() : providerIsDeepSeek ? aiProperties.deepseek().model() : aiProperties.openai().model(),
                providerIsGemini ? aiProperties.gemini().baseUrl() : providerIsDeepSeek ? aiProperties.deepseek().baseUrl() : aiProperties.openai().baseUrl(),
                providerIsGemini ? aiProperties.gemini().timeoutSeconds() : providerIsDeepSeek ? aiProperties.deepseek().timeoutSeconds() : aiProperties.openai().timeoutSeconds(),
                statusMessage
        );
    }
}
