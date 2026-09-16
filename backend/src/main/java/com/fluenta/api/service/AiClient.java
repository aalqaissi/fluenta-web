package com.fluenta.api.service;

import java.util.List;

/** Minimal seam over the LLM SDK. Keeps the SDK out of feature code. */
public interface AiClient {
    /** Single-turn completion (writing feedback). */
    String complete(String systemPrompt, String userPrompt);

    /** Multi-turn chat (coach). Turns are in order; role is "user" or "assistant". */
    String chat(String systemPrompt, List<ChatTurn> turns);

    record ChatTurn(String role, String text) {}
}
