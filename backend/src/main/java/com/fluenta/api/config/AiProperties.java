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
        @DefaultValue("true") boolean persist) {

    /** True when a live model call should be attempted; false → offline heuristic. */
    public boolean live() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    /** Never expose the raw API key via the auto-generated record toString(). */
    @Override
    public String toString() {
        return "AiProperties[enabled=" + enabled
                + ", apiKey=" + (apiKey == null || apiKey.isBlank() ? "<blank>" : "<set>")
                + ", model=" + model
                + ", effort=" + effort
                + ", timeoutSeconds=" + timeoutSeconds
                + ", maxEssayChars=" + maxEssayChars
                + ", persist=" + persist + "]";
    }
}
