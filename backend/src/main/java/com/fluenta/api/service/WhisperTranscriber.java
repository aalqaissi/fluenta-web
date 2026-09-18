package com.fluenta.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.config.TranscribeProperties;
import com.fluenta.api.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/** Live STT via the OpenAI Whisper transcriptions REST endpoint (multipart). The only Transcriber bean. */
@Component
public class WhisperTranscriber implements Transcriber {

    private final TranscribeProperties props;
    private final ObjectMapper om;
    private volatile HttpClient http;

    public WhisperTranscriber(TranscribeProperties props, ObjectMapper om) {
        this.props = props;
        this.om = om;
    }

    @Override
    public String transcribe(byte[] audio, String mediaType) {
        String boundary = "----fluenta" + Long.toHexString(System.nanoTime());
        String filename = "audio." + ext(mediaType);
        try {
            byte[] body = multipart(boundary, audio, mediaType, filename);
            HttpRequest req = HttpRequest.newBuilder(URI.create(props.baseUrl()))
                    .header("Authorization", "Bearer " + props.apiKey())
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                    .timeout(Duration.ofSeconds(120))
                    .build();
            HttpResponse<String> res = getHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                throw new ApiException(HttpStatus.BAD_GATEWAY,
                        "The speech service is temporarily unavailable. Please try again.");
            }
            return om.readTree(res.body()).path("text").asText("");
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "The speech service could not be reached. Please try again.");
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

    private byte[] multipart(String boundary, byte[] audio, String mediaType, String filename) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        writeField(out, boundary, "model", props.model());
        writeField(out, boundary, "language", "en");
        writeField(out, boundary, "response_format", "json");
        // file part
        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n")
                .getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Type: " + (mediaType == null ? "application/octet-stream" : mediaType) + "\r\n\r\n")
                .getBytes(StandardCharsets.UTF_8));
        out.write(audio);
        out.write("\r\n".getBytes(StandardCharsets.UTF_8));
        out.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return out.toByteArray();
    }

    private void writeField(ByteArrayOutputStream out, String boundary, String name, String value) throws Exception {
        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(value.getBytes(StandardCharsets.UTF_8));
        out.write("\r\n".getBytes(StandardCharsets.UTF_8));
    }

    private String ext(String mediaType) {
        if (mediaType == null) return "webm";
        if (mediaType.contains("webm")) return "webm";
        if (mediaType.contains("mp4") || mediaType.contains("m4a")) return "m4a";
        if (mediaType.contains("mpeg") || mediaType.contains("mp3")) return "mp3";
        if (mediaType.contains("wav")) return "wav";
        if (mediaType.contains("aac")) return "aac";
        return "webm";
    }
}
