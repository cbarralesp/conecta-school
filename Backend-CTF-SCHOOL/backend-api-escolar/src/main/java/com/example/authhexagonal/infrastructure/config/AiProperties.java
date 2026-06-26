package com.example.authhexagonal.infrastructure.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(
        String provider,
        OpenAi openai,
        Gemini gemini,
        DeepSeek deepseek
) {

    public AiProperties {
        provider = provider == null || provider.isBlank() ? "local" : provider.trim().toLowerCase(java.util.Locale.ROOT);
        openai = openai == null ? new OpenAi(null, "gpt-5.4-mini", "https://api.openai.com/v1", 45) : openai;
        gemini = gemini == null ? new Gemini(null, "gemini-3.5-flash", "https://generativelanguage.googleapis.com/v1beta", 45) : gemini;
        deepseek = deepseek == null ? new DeepSeek(null, "deepseek-v4-pro", "https://api.deepseek.com", 45) : deepseek;
    }

    public record OpenAi(
            String apiKey,
            String model,
            String baseUrl,
            @Min(5) int timeoutSeconds
    ) {
        public OpenAi {
            model = model == null || model.isBlank() ? "gpt-5.4-mini" : model.trim();
            baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://api.openai.com/v1" : baseUrl.trim();
            timeoutSeconds = timeoutSeconds <= 0 ? 45 : timeoutSeconds;
        }
    }

    public record Gemini(
            String apiKey,
            String model,
            String baseUrl,
            @Min(5) int timeoutSeconds
    ) {
        public Gemini {
            model = model == null || model.isBlank() ? "gemini-3.5-flash" : model.trim();
            baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://generativelanguage.googleapis.com/v1beta" : baseUrl.trim();
            timeoutSeconds = timeoutSeconds <= 0 ? 45 : timeoutSeconds;
        }
    }

    public record DeepSeek(
            String apiKey,
            String model,
            String baseUrl,
            @Min(5) int timeoutSeconds
    ) {
        public DeepSeek {
            model = model == null || model.isBlank() ? "deepseek-v4-pro" : model.trim();
            baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://api.deepseek.com" : baseUrl.trim();
            timeoutSeconds = timeoutSeconds <= 0 ? 45 : timeoutSeconds;
        }
    }
}
