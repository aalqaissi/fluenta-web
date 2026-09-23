package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.web.ApiException;
import org.springframework.http.HttpStatus;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

/** Generic AiClient over any OpenAI-compatible /chat/completions endpoint (Gemini, OpenAI, Groq, DeepSeek,
 *  OpenRouter, local). Instantiated by AiClientConfig when fluenta.ai.provider != "anthropic". */
public class OpenAiCompatibleAiClient implements AiClient {

    private final AiProperties props;
    private final ObjectMapper om;
    private volatile HttpClient http;

    public OpenAiCompatibleAiClient(AiProperties props, ObjectMapper om) {
        this.props = props;
        this.om = om;
    }

    @Override
    public String complete(String systemPrompt, String userPrompt) {
        return send(buildCompleteBody(systemPrompt, userPrompt));
    }

    @Override
    public String chat(String systemPrompt, List<ChatTurn> turns) {
        return send(buildChatBody(systemPrompt, turns));
    }

    @Override
    public String vision(String systemPrompt, String userText, List<ImageInput> images) {
        return send(buildVisionBody(systemPrompt, userText, images));
    }

    // --- request builders + parser: public so cross-package tests can exercise them without a network call ---

    public String buildCompleteBody(String systemPrompt, String userPrompt) {
        ArrayNode messages = om.createArrayNode();
        messages.add(msg("system", systemPrompt));
        messages.add(msg("user", userPrompt));
        return body(messages);
    }

    public String buildChatBody(String systemPrompt, List<ChatTurn> turns) {
        ArrayNode messages = om.createArrayNode();
        messages.add(msg("system", systemPrompt));
        for (ChatTurn t : turns) {
            String role = "assistant".equals(t.role()) ? "assistant" : "user";
            messages.add(msg(role, t.text()));
        }
        return body(messages);
    }

    public String buildVisionBody(String systemPrompt, String userText, List<ImageInput> images) {
        ArrayNode messages = om.createArrayNode();
        messages.add(msg("system", systemPrompt));
        ObjectNode userMsg = om.createObjectNode();
        userMsg.put("role", "user");
        ArrayNode content = om.createArrayNode();
        ObjectNode textPart = om.createObjectNode();
        textPart.put("type", "text");
        textPart.put("text", userText == null ? "" : userText);
        content.add(textPart);
        for (ImageInput img : images) {
            ObjectNode imgPart = om.createObjectNode();
            imgPart.put("type", "image_url");
            ObjectNode url = om.createObjectNode();
            url.put("url", "data:" + img.mediaType() + ";base64," + img.base64());
            imgPart.set("image_url", url);
            content.add(imgPart);
        }
        userMsg.set("content", content);
        messages.add(userMsg);
        return body(messages);
    }

    public String parseContent(String responseJson) {
        try {
            JsonNode node = om.readTree(responseJson);
            return node.path("choices").path(0).path("message").path("content").asText("");
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Could not read the AI response.");
        }
    }

    // --- internals ---

    private String body(ArrayNode messages) {
        ObjectNode b = om.createObjectNode();
        b.put("model", props.effectiveModel());
        b.put("max_tokens", props.maxTokens());
        b.set("messages", messages);
        return b.toString();
    }

    private ObjectNode msg(String role, String content) {
        ObjectNode m = om.createObjectNode();
        m.put("role", role);
        m.put("content", content == null ? "" : content);
        return m;
    }

    private String send(String requestBody) {
        String base = props.effectiveBaseUrl();
        if (base == null || base.isBlank()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "No base URL configured for AI provider '" + props.providerOrDefault()
                            + "' — set fluenta.ai.base-url");
        }
        String url = base.endsWith("/") ? base + "chat/completions" : base + "/chat/completions";
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .header("Authorization", "Bearer " + props.apiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(props.timeoutSeconds()))
                    .build();
            HttpResponse<String> res = getHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                throw new ApiException(HttpStatus.BAD_GATEWAY,
                        "The AI service is temporarily unavailable. Please try again.");
            }
            return parseContent(res.body());
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The AI service could not be reached. Please try again.");
        }
    }

    private HttpClient getHttpClient() {
        if (http == null) {
            synchronized (this) {
                if (http == null) {
                    http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
                }
            }
        }
        return http;
    }
}
