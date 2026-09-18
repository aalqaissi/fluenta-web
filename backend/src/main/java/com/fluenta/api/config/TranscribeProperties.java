package com.fluenta.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Binds {@code fluenta.ai.transcribe.*}. Live STT requires enabled AND a non-blank API key. */
@ConfigurationProperties("fluenta.ai.transcribe")
public record TranscribeProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue("") String apiKey,
        @DefaultValue("https://api.openai.com/v1/audio/transcriptions") String baseUrl,
        @DefaultValue("whisper-1") String model,
        @DefaultValue("25000000") long maxAudioBytes,
        @DefaultValue("240") int maxAudioSeconds) {

    /** True when a live STT call should be attempted; false → offline stub transcript. */
    public boolean live() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    /** Never expose the raw API key. */
    @Override
    public String toString() {
        return "TranscribeProperties[enabled=" + enabled
                + ", apiKey=" + (apiKey == null || apiKey.isBlank() ? "<blank>" : "<set>")
                + ", baseUrl=" + baseUrl + ", model=" + model
                + ", maxAudioBytes=" + maxAudioBytes + ", maxAudioSeconds=" + maxAudioSeconds + "]";
    }
}
