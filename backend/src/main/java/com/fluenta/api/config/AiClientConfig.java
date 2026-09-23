package com.fluenta.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.AnthropicAiClient;
import com.fluenta.api.service.OpenAiCompatibleAiClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Selects the single AiClient bean by fluenta.ai.provider (default "anthropic" -> native SDK client). */
@Configuration
public class AiClientConfig {

    @Bean
    public AiClient aiClient(AiProperties props, ObjectMapper om) {
        return "anthropic".equals(props.providerOrDefault())
                ? new AnthropicAiClient(props)
                : new OpenAiCompatibleAiClient(props, om);
    }
}
