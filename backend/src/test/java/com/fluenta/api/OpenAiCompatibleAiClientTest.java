package com.fluenta.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.OpenAiCompatibleAiClient;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OpenAiCompatibleAiClientTest {

    private final ObjectMapper om = new ObjectMapper();
    // provider gemini, explicit model so effectiveModel() is deterministic
    private final AiProperties props = new AiProperties(
            true, "sk", "gemini-2.0-flash", "medium", 60, 12000, 5000000, false, "gemini", "", 8192);
    private final OpenAiCompatibleAiClient client = new OpenAiCompatibleAiClient(props, om);

    @Test
    void completeBodyHasSystemAndUserAndModelAndMaxTokens() throws Exception {
        JsonNode b = om.readTree(client.buildCompleteBody("SYS", "USER"));
        assertThat(b.path("model").asText()).isEqualTo("gemini-2.0-flash");
        assertThat(b.path("max_tokens").asInt()).isEqualTo(8192);
        assertThat(b.path("messages").get(0).path("role").asText()).isEqualTo("system");
        assertThat(b.path("messages").get(0).path("content").asText()).isEqualTo("SYS");
        assertThat(b.path("messages").get(1).path("role").asText()).isEqualTo("user");
        assertThat(b.path("messages").get(1).path("content").asText()).isEqualTo("USER");
    }

    @Test
    void chatBodyMapsAssistantAndUserRolesInOrder() throws Exception {
        JsonNode b = om.readTree(client.buildChatBody("SYS", List.of(
                new AiClient.ChatTurn("user", "hi"),
                new AiClient.ChatTurn("assistant", "hello"),
                new AiClient.ChatTurn("user", "bye"))));
        var msgs = b.path("messages");
        assertThat(msgs.get(0).path("role").asText()).isEqualTo("system");
        assertThat(msgs.get(1).path("role").asText()).isEqualTo("user");
        assertThat(msgs.get(2).path("role").asText()).isEqualTo("assistant");
        assertThat(msgs.get(3).path("role").asText()).isEqualTo("user");
        assertThat(msgs.get(3).path("content").asText()).isEqualTo("bye");
    }

    @Test
    void visionBodyEmbedsImagesAsDataUris() throws Exception {
        JsonNode b = om.readTree(client.buildVisionBody("SYS", "look",
                List.of(new AiClient.ImageInput("QUJD", "image/png"))));
        var content = b.path("messages").get(1).path("content");   // user message content array
        assertThat(content.get(0).path("type").asText()).isEqualTo("text");
        assertThat(content.get(0).path("text").asText()).isEqualTo("look");
        assertThat(content.get(1).path("type").asText()).isEqualTo("image_url");
        assertThat(content.get(1).path("image_url").path("url").asText())
                .isEqualTo("data:image/png;base64,QUJD");
    }

    @Test
    void parseContentExtractsChoiceMessageContent() {
        String resp = "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"the answer\"}}]}";
        assertThat(client.parseContent(resp)).isEqualTo("the answer");
        assertThat(client.parseContent("{\"choices\":[]}")).isEmpty();   // tolerant of missing
    }
}
