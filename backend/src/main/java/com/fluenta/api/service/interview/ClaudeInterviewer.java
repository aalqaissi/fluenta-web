package com.fluenta.api.service.interview;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.service.AiClient;
import org.springframework.stereotype.Component;

import java.util.List;

/** Live examiner: one AiClient.chat call returning {reply,part,done} JSON. The only Interviewer bean. */
@Component
public class ClaudeInterviewer implements Interviewer {

    private final AiClient ai;
    private final ObjectMapper om;

    public ClaudeInterviewer(AiClient ai, ObjectMapper om) {
        this.ai = ai;
        this.om = om;
    }

    @Override
    public Reply next(String systemPrompt, List<AiClient.ChatTurn> turns, int currentPart) {
        String raw = ai.chat(systemPrompt, turns);
        JsonNode node = tryParse(raw);
        if (node == null) {
            // Non-JSON reply: use it verbatim, stay in the current part, don't end.
            String text = raw == null ? "" : raw.trim();
            return new Reply(text, currentPart, false);
        }
        String reply = node.path("reply").asText("").trim();
        if (reply.isEmpty()) reply = raw == null ? "" : raw.trim();
        int part = node.path("part").asInt(currentPart);
        boolean done = node.path("done").asBoolean(false);
        return new Reply(reply, part, done);
    }

    private JsonNode tryParse(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        int a = s.indexOf('{'), b = s.lastIndexOf('}');
        if (a < 0 || b <= a) return null;
        try { return om.readTree(s.substring(a, b + 1)); }
        catch (Exception e) { return null; }
    }
}
