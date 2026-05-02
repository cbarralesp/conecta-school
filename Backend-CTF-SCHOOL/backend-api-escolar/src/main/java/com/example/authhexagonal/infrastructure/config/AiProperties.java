package com.example.authhexagonal.infrastructure.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(
        String provider,
        OpenAi openai
) {

    public AiProperties {
        provider = provider == null || provider.isBlank() ? "local" : provider.trim().toLowerCase(java.util.Locale.ROOT);
        openai = openai == null ? new OpenAi(null, "gpt-5.4-mini", "https://api.openai.com/v1", 45) : openai;
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
}
