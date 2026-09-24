package com.fluenta.api.config;

import java.util.Map;

/** LLM provider alias -> default {base-url, model}. Anthropic base-url is n/a (native SDK). Pure; no Spring. */
public final class LlmProviders {
    private LlmProviders() {}

    private record Preset(String baseUrl, String model) {}

    private static final Map<String, Preset> PRESETS = Map.of(
            "anthropic",  new Preset("", "claude-sonnet-5"),
            "openai",     new Preset("https://api.openai.com/v1", "gpt-4o-mini"),
            "gemini",     new Preset("https://generativelanguage.googleapis.com/v1beta/openai", "gemini-3.6-flash"),
            "groq",       new Preset("https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"),
            "deepseek",   new Preset("https://api.deepseek.com", "deepseek-chat"),
            "openrouter", new Preset("https://openrouter.ai/api/v1", ""));

    public static String baseUrl(String provider) {
        Preset p = PRESETS.get(provider == null ? "" : provider.toLowerCase());
        return p == null ? "" : p.baseUrl();
    }

    public static String model(String provider) {
        Preset p = PRESETS.get(provider == null ? "" : provider.toLowerCase());
        return p == null ? "" : p.model();
    }
}
