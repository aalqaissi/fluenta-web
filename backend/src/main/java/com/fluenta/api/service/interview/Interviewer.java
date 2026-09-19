package com.fluenta.api.service.interview;

import com.fluenta.api.service.AiClient;

import java.util.List;

/** Minimal seam over the examiner LLM turn. Live impl parses {reply,part,done}; keeps the SDK out of the service. */
public interface Interviewer {
    /** Given the examiner system prompt + mapped chat turns + the current part, produce the examiner's next line. */
    Reply next(String systemPrompt, List<AiClient.ChatTurn> turns, int currentPart);

    record Reply(String text, int part, boolean done) {}
}
