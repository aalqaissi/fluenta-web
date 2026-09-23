package com.fluenta.api.config;

import java.util.Map;

/** STT provider alias -> default {base-url, model}. Pure; no Spring. */
public final class SttProviders {
    private SttProviders() {}

    private record Preset(String baseUrl, String model) {}

    private static final Map<String, Preset> PRESETS = Map.of(
            "openai", new Preset("https://api.openai.com/v1/audio/transcriptions", "whisper-1"),
            "groq",   new Preset("https://api.groq.com/openai/v1/audio/transcriptions", "whisper-large-v3"));

    public static String baseUrl(String provider) {
        Preset p = PRESETS.get(provider == null ? "" : provider.toLowerCase());
        return p == null ? "" : p.baseUrl();
    }

    public static String model(String provider) {
        Preset p = PRESETS.get(provider == null ? "" : provider.toLowerCase());
        return p == null ? "" : p.model();
    }
}
