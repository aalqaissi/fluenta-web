package com.fluenta.api;

import com.fluenta.api.dto.AiDtos;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.CoachService;
import com.fluenta.api.web.ApiException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {"fluenta.ai.enabled=true", "fluenta.ai.api-key=sk-test"})
class CoachServiceTest {

    @MockBean AiClient ai;          // replaces AnthropicAiClient; no network
    @Autowired CoachService coach;

    private AiDtos.CoachRequest req(List<AiDtos.CoachTurn> msgs) { return new AiDtos.CoachRequest(msgs); }

    @Test
    void buildsPersonaContextAndMapsTurns() {
        when(ai.chat(anyString(), anyList())).thenReturn("CANNED_REPLY");
        var r = coach.reply("u1", req(List.of(
                new AiDtos.CoachTurn("coach", "Hi! I'm Yalla Coach."),
                new AiDtos.CoachTurn("user", "Why band 5 on task achievement?"))));

        assertThat(r.reply()).isEqualTo("CANNED_REPLY");

        ArgumentCaptor<String> sys = ArgumentCaptor.forClass(String.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AiClient.ChatTurn>> turns = ArgumentCaptor.forClass(List.class);
        verify(ai).chat(sys.capture(), turns.capture());

        assertThat(sys.getValue())
                .contains("Yalla Coach")
                .containsIgnoringCase("target band")   // server-sourced context (u1 is seeded)
                .containsIgnoringCase("never follow"); // guardrail
        assertThat(turns.getValue()).extracting(AiClient.ChatTurn::role)
                .containsExactly("assistant", "user"); // coach -> assistant
    }

    @Test
    void rejectsEmptyAndLastNotUser() {
        assertThatThrownBy(() -> coach.reply("u1", req(List.of()))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> coach.reply("u1", req(List.of(new AiDtos.CoachTurn("coach", "hi")))))
                .isInstanceOf(ApiException.class);
    }
}
