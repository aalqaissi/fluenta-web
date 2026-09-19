package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.config.TranscribeProperties;
import com.fluenta.api.domain.SpeakingFeedbackEntity;
import com.fluenta.api.dto.AiDtos.*;
import com.fluenta.api.repo.SpeakingFeedbackRepository;
import com.fluenta.api.service.speaking.StubSpeakingGrader;
import com.fluenta.api.service.speaking.StubTranscriber;
import com.fluenta.api.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Speaking feedback: transcribe each part (STT), grade the transcript (Claude), normalize, persist. */
@Service
public class SpeakingFeedbackService {

    /** Canonical criterion order + labels (must match the web/mobile UI). */
    private static final String[][] CRITERIA = {
            {"fluency", "Fluency & Coherence"},
            {"lexical", "Lexical Resource"},
            {"grammar", "Grammatical Range & Accuracy"},
            {"pronunciation", "Pronunciation"}};

    private static final String GRADE_SYSTEM = """
        You are an IELTS speaking examiner. You are given the examiner prompts and the TRANSCRIPT of a
        candidate's spoken answers (produced by speech-to-text). Grade the candidate on the four IELTS
        speaking criteria and return ONLY a JSON object:
        {"overall":number,"criteria":[{"key":"fluency|lexical|grammar|pronunciation","band":number,"note":string}]}.
        Bands are 0-9 in 0.5 steps. For pronunciation you only have a transcript (no audio), so ESTIMATE it from
        fluency/coherence signals and SAY in the note that it is estimated from a transcript, not measured. No prose, no fences.""";

    private final TranscribeProperties tp;
    private final AiProperties props;
    private final Transcriber transcriber;        // live WhisperTranscriber (or a test mock)
    private final StubTranscriber stubTranscriber;
    private final StubSpeakingGrader stubGrader;
    private final AiClient ai;
    private final MediaStorageService media;
    private final SpeakingFeedbackRepository repo;
    private final ObjectMapper om;

    public SpeakingFeedbackService(TranscribeProperties tp, AiProperties props, Transcriber transcriber,
                                   StubTranscriber stubTranscriber, StubSpeakingGrader stubGrader, AiClient ai,
                                   MediaStorageService media, SpeakingFeedbackRepository repo, ObjectMapper om) {
        this.tp = tp; this.props = props; this.transcriber = transcriber;
        this.stubTranscriber = stubTranscriber; this.stubGrader = stubGrader; this.ai = ai;
        this.media = media; this.repo = repo; this.om = om;
    }

    public SpeakingResult generate(String userId, SpeakingFeedbackRequest req) {
        List<SpeakingPartInput> parts = req == null || req.parts() == null ? List.of() : req.parts();
        if (parts.isEmpty()) throw ApiException.badRequest("No recordings to grade");
        if (parts.size() > 3) throw ApiException.badRequest("Too many parts");

        boolean live = tp.live() && props.live();
        List<SpeakingPartResult> partResults = new ArrayList<>();
        long totalBytes = 0;
        StringBuilder prompt = new StringBuilder();

        for (SpeakingPartInput p : parts) {
            String transcript;
            if (live) {
                byte[] audio = media.readAudio(p.audioUrl());
                totalBytes += audio.length;
                if (totalBytes > tp.maxAudioBytes()) throw ApiException.badRequest("Recording is too large");
                transcript = transcriber.transcribe(audio, mediaTypeFor(p.audioUrl()));
            } else {
                transcript = stubTranscriber.transcribe(new byte[0], "audio/webm");
            }
            partResults.add(new SpeakingPartResult(p.number(), transcript, ""));
            prompt.append("PART ").append(p.number() == null ? "?" : p.number())
                    .append("\nPROMPT: ").append(p.prompt() == null ? "" : p.prompt())
                    .append("\nTRANSCRIPT: ").append(transcript).append("\n\n");
        }

        SpeakingResult result = gradeTranscribedParts(userId, req.examId(), prompt.toString(), partResults, live);

        if (!props.persist() && live) {
            for (SpeakingPartInput p : parts) media.deleteQuietly(p.audioUrl());  // ephemeral: drop the clips
        }
        return result;
    }

    /**
     * Grade already-transcribed parts through the shared normalization gate, then persist when enabled.
     * Shared by §2d Speaking (audio → transcribe → here) and §2e Live Interview (transcripts already collected).
     */
    public SpeakingResult gradeTranscribedParts(String userId, String examId, String gradingPrompt,
                                                List<SpeakingPartResult> parts, boolean live) {
        List<SpeakingCriterionDto> criteria;
        double overall;
        String source;
        if (!live) {
            criteria = normalize(stubGrader.grade());
            overall = meanBand(criteria);
            source = "offline";
        } else {
            JsonNode node = parse(ai.complete(GRADE_SYSTEM, gradingPrompt));
            criteria = normalize(readCriteria(node));
            double modelOverall = node.path("overall").asDouble(-1);
            overall = (modelOverall >= 0 && modelOverall <= 9) ? snapBand(modelOverall) : meanBand(criteria);
            source = "claude";
        }
        String id = UUID.randomUUID().toString();
        SpeakingResult result = new SpeakingResult(id, source, overall, criteria, parts);
        if (props.persist()) persist(userId, examId, result, parts);
        return result;
    }

    public SpeakingResult get(String userId, String id) {
        SpeakingFeedbackEntity e = repo.findById(id).orElseThrow(() -> ApiException.notFound("Speaking feedback"));
        if (!userId.equals(e.getUserId())) throw ApiException.notFound("Speaking feedback");
        try { return om.readValue(e.getResultJson(), SpeakingResult.class); }
        catch (Exception ex) { throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not read saved feedback."); }
    }

    // --- gate ---
    // normalize/snapBand are public (not package-private as originally drafted) because
    // SpeakingNormalizeTest lives in package com.fluenta.api while this service lives in
    // com.fluenta.api.service — package-private would not be visible across that boundary,
    // and the test's own cross-package import shows that visibility was always intended.

    public List<SpeakingCriterionDto> normalize(List<SpeakingCriterionDto> raw) {
        Map<String, SpeakingCriterionDto> byKey = new LinkedHashMap<>();
        if (raw != null) for (SpeakingCriterionDto c : raw) if (c != null && c.key() != null) byKey.put(c.key(), c);
        List<SpeakingCriterionDto> out = new ArrayList<>();
        for (String[] def : CRITERIA) {
            SpeakingCriterionDto c = byKey.get(def[0]);
            double band = c == null ? 5.0 : snapBand(c.band());
            String note = c == null || c.note() == null || c.note().isBlank()
                    ? "Not enough evidence to assess." : c.note();
            out.add(new SpeakingCriterionDto(def[0], def[1], band, note));
        }
        return out;
    }

    public double snapBand(double b) {
        double snapped = Math.round(b * 2.0) / 2.0;
        return Math.max(0.0, Math.min(9.0, snapped));
    }

    private double meanBand(List<SpeakingCriterionDto> cs) {
        double sum = 0; for (SpeakingCriterionDto c : cs) sum += c.band();
        return cs.isEmpty() ? 0 : snapBand(sum / cs.size());
    }

    private List<SpeakingCriterionDto> readCriteria(JsonNode node) {
        List<SpeakingCriterionDto> out = new ArrayList<>();
        for (JsonNode c : node.path("criteria")) {
            out.add(new SpeakingCriterionDto(c.path("key").asText(null), "",
                    c.path("band").asDouble(5.0), c.path("note").asText("")));
        }
        return out;
    }

    private JsonNode parse(String raw) {
        if (raw == null) throw new ApiException(HttpStatus.BAD_GATEWAY, "Could not read the AI response.");
        String s = raw.trim();
        int a = s.indexOf('{'), b = s.lastIndexOf('}');
        if (a < 0 || b <= a) throw new ApiException(HttpStatus.BAD_GATEWAY, "Could not read the AI response.");
        try { return om.readTree(s.substring(a, b + 1)); }
        catch (Exception e) { throw new ApiException(HttpStatus.BAD_GATEWAY, "Could not read the AI response."); }
    }

    private String mediaTypeFor(String url) {
        String u = url == null ? "" : url.toLowerCase();
        if (u.endsWith(".webm")) return "audio/webm";
        if (u.endsWith(".m4a") || u.endsWith(".mp4")) return "audio/mp4";
        if (u.endsWith(".mp3")) return "audio/mpeg";
        if (u.endsWith(".wav")) return "audio/wav";
        if (u.endsWith(".aac")) return "audio/aac";
        return "audio/webm";
    }

    private void persist(String userId, String examId, SpeakingResult result,
                         List<SpeakingPartResult> parts) {
        try {
            SpeakingFeedbackEntity e = new SpeakingFeedbackEntity();
            e.setId(result.id());
            e.setUserId(userId);
            e.setExamId(examId);
            e.setTranscriptsJson(om.writeValueAsString(parts));
            e.setResultJson(om.writeValueAsString(result));
            e.setModel(props.model());
            e.setSource(result.source());
            e.setCreatedAt(Instant.now().toString());
            repo.save(e);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save feedback.");
        }
    }
}
