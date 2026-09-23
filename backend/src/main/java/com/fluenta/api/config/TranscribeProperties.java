package com.fluenta.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Binds {@code fluenta.ai.transcribe.*}. Live STT requires enabled AND a non-blank API key. */
@ConfigurationProperties("fluenta.ai.transcribe")
public record TranscribeProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue("") String apiKey,
        @DefaultValue("") String baseUrl,      // blank -> resolved from provider preset
        @DefaultValue("") String model,        // blank -> resolved from provider preset
        @DefaultValue("25000000") long maxAudioBytes,
        @DefaultValue("240") int maxAudioSeconds,
        @DefaultValue("openai") String provider) {

    /** True when a live STT call should be attempted; false → offline stub transcript. */
    public boolean live() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    /** Normalized provider alias, defaulting to "openai" when blank. */
    public String providerOrDefault() {
        return provider == null || provider.isBlank() ? "openai" : provider.trim().toLowerCase();
    }

    /** Explicit {@code baseUrl} wins; otherwise resolved from the provider preset. */
    public String effectiveBaseUrl() {
        return baseUrl != null && !baseUrl.isBlank() ? baseUrl : SttProviders.baseUrl(providerOrDefault());
    }

    /** Explicit {@code model} wins; otherwise resolved from the provider preset. */
    public String effectiveModel() {
        return model != null && !model.isBlank() ? model : SttProviders.model(providerOrDefault());
    }

    /** Never expose the raw API key. */
    @Override
    public String toString() {
        return "TranscribeProperties[enabled=" + enabled
                + ", apiKey=" + (apiKey == null || apiKey.isBlank() ? "<blank>" : "<set>")
                + ", provider=" + provider + ", baseUrl=" + baseUrl + ", model=" + model
                + ", maxAudioBytes=" + maxAudioBytes + ", maxAudioSeconds=" + maxAudioSeconds + "]";
    }
}
