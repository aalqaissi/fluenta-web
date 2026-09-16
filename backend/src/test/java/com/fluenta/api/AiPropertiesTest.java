package com.fluenta.api;

import com.fluenta.api.config.AiProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class AiPropertiesTest {
    @Autowired AiProperties props;

    @Test
    void bindsDefaults() {
        assertThat(props.model()).isEqualTo("claude-sonnet-5");
        assertThat(props.persist()).isTrue();
        assertThat(props.maxEssayChars()).isEqualTo(12000);
        // No ANTHROPIC_API_KEY in the test env → offline mode.
        assertThat(props.live()).isFalse();
    }
}
