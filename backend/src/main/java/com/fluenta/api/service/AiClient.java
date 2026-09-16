package com.fluenta.api.service;

/** Minimal seam over the LLM SDK: one prompt in, model text out. Keeps the SDK out of feature code. */
public interface AiClient {
    String complete(String systemPrompt, String userPrompt);
}
