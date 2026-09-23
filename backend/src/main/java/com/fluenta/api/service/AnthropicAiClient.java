package com.fluenta.api.service;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.OutputConfig;
import com.anthropic.models.messages.ThinkingConfigAdaptive;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

/** Live AiClient backed by the Anthropic Java SDK. SDK client is built lazily (never in offline mode). */
@Service
public class AnthropicAiClient implements AiClient {

    private final AiProperties props;
    private volatile AnthropicClient client;

    public AnthropicAiClient(AiProperties props) { this.props = props; }

    private AnthropicClient client() {
        if (client == null) {
            synchronized (this) {
                if (client == null) {
                    client = AnthropicOkHttpClient.builder()
                            .apiKey(props.apiKey())
                            .timeout(Duration.ofSeconds(props.timeoutSeconds()))
                            .build();
                }
            }
        }
        return client;
    }

    @Override
    public String complete(String systemPrompt, String userPrompt) {
        try {
            MessageCreateParams params = MessageCreateParams.builder()
                    .model(props.effectiveModel())
                    .maxTokens(16000L)
                    .thinking(ThinkingConfigAdaptive.builder().build())
                    .outputConfig(OutputConfig.builder().effort(effort()).build())
                    .system(systemPrompt)
                    .addUserMessage(userPrompt)
                    .build();
            Message response = client().messages().create(params);
            StringBuilder sb = new StringBuilder();
            response.content().forEach(block -> block.text().ifPresent(t -> sb.append(t.text())));
            return sb.toString();
        } catch (AnthropicServiceException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "The writing grader is temporarily unavailable. Please try again.");
        } catch (RuntimeException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "The writing grader could not be reached. Please try again.");
        }
    }

    @Override
    public String chat(String systemPrompt, java.util.List<ChatTurn> turns) {
        try {
            MessageCreateParams.Builder b = MessageCreateParams.builder()
                    .model(props.effectiveModel())
                    .maxTokens(16000L)
                    .thinking(ThinkingConfigAdaptive.builder().build())
                    .outputConfig(OutputConfig.builder().effort(effort()).build())
                    .system(systemPrompt);
            for (ChatTurn t : turns) {
                if ("assistant".equals(t.role())) {
                    b.addAssistantMessage(t.text());
                } else {
                    b.addUserMessage(t.text());
                }
            }
            Message response = client().messages().create(b.build());
            StringBuilder sb = new StringBuilder();
            response.content().forEach(block -> block.text().ifPresent(x -> sb.append(x.text())));
            return sb.toString();
        } catch (AnthropicServiceException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The coach is temporarily unavailable. Please try again.");
        } catch (RuntimeException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The coach could not be reached. Please try again.");
        }
    }

    @Override
    public String vision(String systemPrompt, String userText, java.util.List<ImageInput> images) {
        try {
            java.util.List<com.anthropic.models.messages.ContentBlockParam> blocks = new java.util.ArrayList<>();
            for (ImageInput img : images) {
                var source = com.anthropic.models.messages.Base64ImageSource.builder()
                        .mediaType(com.anthropic.models.messages.Base64ImageSource.MediaType.of(img.mediaType()))
                        .data(img.base64())
                        .build();
                blocks.add(com.anthropic.models.messages.ContentBlockParam.ofImage(
                        com.anthropic.models.messages.ImageBlockParam.builder().source(source).build()));
            }
            blocks.add(com.anthropic.models.messages.ContentBlockParam.ofText(
                    com.anthropic.models.messages.TextBlockParam.builder().text(userText).build()));

            MessageCreateParams params = MessageCreateParams.builder()
                    .model(props.effectiveModel())
                    .maxTokens(16000L)
                    .thinking(ThinkingConfigAdaptive.builder().build())
                    .outputConfig(OutputConfig.builder().effort(effort()).build())
                    .system(systemPrompt)
                    .addUserMessageOfBlockParams(blocks)
                    .build();
            Message response = client().messages().create(params);
            StringBuilder sb = new StringBuilder();
            response.content().forEach(block -> block.text().ifPresent(x -> sb.append(x.text())));
            return sb.toString();
        } catch (AnthropicServiceException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The Studio AI is temporarily unavailable. Please try again.");
        } catch (RuntimeException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The Studio AI could not be reached. Please try again.");
        }
    }

    private OutputConfig.Effort effort() {
        // OutputConfig.Effort is an SDK "open enum" (final class with named constants + of(String)),
        // not a java.lang.Enum, so there is no valueOf(String); use of(...) with an explicit blank guard
        // instead of a try/catch, since of(...) never throws for an unrecognized value.
        String raw = props.effort();
        if (raw == null || raw.isBlank()) return OutputConfig.Effort.MEDIUM;
        return OutputConfig.Effort.of(raw.toLowerCase());
    }
}
