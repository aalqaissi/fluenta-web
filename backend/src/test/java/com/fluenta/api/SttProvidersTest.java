package com.fluenta.api;

import com.fluenta.api.config.SttProviders;
import com.fluenta.api.config.TranscribeProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SttProvidersTest {

    @Test
    void aliasesResolveToPresets() {
        assertThat(SttProviders.baseUrl("openai")).isEqualTo("https://api.openai.com/v1/audio/transcriptions");
        assertThat(SttProviders.model("openai")).isEqualTo("whisper-1");
        assertThat(SttProviders.baseUrl("groq")).isEqualTo("https://api.groq.com/openai/v1/audio/transcriptions");
        assertThat(SttProviders.model("groq")).isEqualTo("whisper-large-v3");
        assertThat(SttProviders.baseUrl("unknown")).isEmpty();
    }

    @Test
    void effectiveValuesUsePresetThenOverride() {
        // provider openai, no explicit base-url/model -> preset
        var openai = new TranscribeProperties(true, "sk", "", "", 25_000_000L, 240, "openai");
        assertThat(openai.effectiveBaseUrl()).isEqualTo("https://api.openai.com/v1/audio/transcriptions");
        assertThat(openai.effectiveModel()).isEqualTo("whisper-1");
        // explicit override wins
        var override = new TranscribeProperties(true, "sk", "https://x/y", "custom", 25_000_000L, 240, "groq");
        assertThat(override.effectiveBaseUrl()).isEqualTo("https://x/y");
        assertThat(override.effectiveModel()).isEqualTo("custom");
        // default provider (blank) -> openai
        var blank = new TranscribeProperties(true, "sk", "", "", 25_000_000L, 240, "");
        assertThat(blank.effectiveModel()).isEqualTo("whisper-1");
    }
}
