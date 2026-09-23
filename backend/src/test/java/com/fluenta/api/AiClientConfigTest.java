package com.fluenta.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.config.AiClientConfig;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.service.AnthropicAiClient;
import com.fluenta.api.service.OpenAiCompatibleAiClient;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiClientConfigTest {

    private final AiClientConfig config = new AiClientConfig();
    private final ObjectMapper om = new ObjectMapper();

    private AiProperties props(String provider) {
        return new AiProperties(true, "sk", "", "medium", 60, 12000, 5000000, false, provider, "", 8192);
    }

    @Test
    void defaultAndAnthropicUseTheSdkClient() {
        assertThat(config.aiClient(props("anthropic"), om)).isInstanceOf(AnthropicAiClient.class);
        assertThat(config.aiClient(props(""), om)).isInstanceOf(AnthropicAiClient.class);   // blank -> anthropic
    }

    @Test
    void nonAnthropicUsesTheCompatClient() {
        assertThat(config.aiClient(props("gemini"), om)).isInstanceOf(OpenAiCompatibleAiClient.class);
        assertThat(config.aiClient(props("deepseek"), om)).isInstanceOf(OpenAiCompatibleAiClient.class);
    }
}
