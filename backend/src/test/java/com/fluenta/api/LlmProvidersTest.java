package com.fluenta.api;

import com.fluenta.api.config.AiProperties;
import com.fluenta.api.config.LlmProviders;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LlmProvidersTest {

    private AiProperties props(String provider, String baseUrl, String model) {
        return new AiProperties(true, "sk", model, "medium", 60, 12000, 5000000, false, provider, baseUrl, 8192);
    }

    @Test
    void aliasesResolveToPresets() {
        assertThat(LlmProviders.model("anthropic")).isEqualTo("claude-sonnet-5");
        assertThat(LlmProviders.baseUrl("gemini")).isEqualTo("https://generativelanguage.googleapis.com/v1beta/openai");
        assertThat(LlmProviders.model("gemini")).isEqualTo("gemini-2.0-flash");
        assertThat(LlmProviders.baseUrl("unknown")).isEmpty();
    }

    @Test
    void effectiveModelAndBaseUrlUsePresetThenOverride() {
        assertThat(props("anthropic", "", "").effectiveModel()).isEqualTo("claude-sonnet-5");   // default unchanged
        assertThat(props("gemini", "", "").effectiveModel()).isEqualTo("gemini-2.0-flash");
        assertThat(props("gemini", "", "").effectiveBaseUrl())
                .isEqualTo("https://generativelanguage.googleapis.com/v1beta/openai");
        assertThat(props("gemini", "https://x/y", "custom-model").effectiveModel()).isEqualTo("custom-model");
        assertThat(props("gemini", "https://x/y", "custom-model").effectiveBaseUrl()).isEqualTo("https://x/y");
        assertThat(props("", "", "").providerOrDefault()).isEqualTo("anthropic");
    }
}
