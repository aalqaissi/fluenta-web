package com.fluenta.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Binds {@code fluenta.ai.*}. Live mode requires the feature enabled AND a non-blank API key. */
@ConfigurationProperties("fluenta.ai")
public record AiProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue("") String apiKey,
        @DefaultValue("") String model,
        @DefaultValue("medium") String effort,
        @DefaultValue("60") int timeoutSeconds,
        @DefaultValue("12000") int maxEssayChars,
        @DefaultValue("5000000") int maxImageBytes,
        @DefaultValue("true") boolean persist,
        @DefaultValue("anthropic") String provider,
        @DefaultValue("") String baseUrl,
        @DefaultValue("8192") int maxTokens) {

    /** True when a live model call should be attempted; false → offline heuristic. */
    public boolean live() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    public String providerOrDefault() {
        return provider == null || provider.isBlank() ? "anthropic" : provider.trim().toLowerCase();
    }

    public String effectiveModel() {
        return model != null && !model.isBlank() ? model : LlmProviders.model(providerOrDefault());
    }

    public String effectiveBaseUrl() {
        return baseUrl != null && !baseUrl.isBlank() ? baseUrl : LlmProviders.baseUrl(providerOrDefault());
    }

    /** Never expose the raw API key via the auto-generated record toString(). */
    @Override
    public String toString() {
        return "AiProperties[enabled=" + enabled
                + ", apiKey=" + (apiKey == null || apiKey.isBlank() ? "<blank>" : "<set>")
                + ", provider=" + provider + ", model=" + model + ", baseUrl=" + baseUrl
                + ", effort=" + effort + ", timeoutSeconds=" + timeoutSeconds
                + ", maxEssayChars=" + maxEssayChars + ", maxImageBytes=" + maxImageBytes
                + ", maxTokens=" + maxTokens + ", persist=" + persist + "]";
    }
}
