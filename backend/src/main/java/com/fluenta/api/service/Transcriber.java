package com.fluenta.api.service;

/** Minimal seam over a speech-to-text provider. Keeps the STT SDK/HTTP out of feature code. */
public interface Transcriber {
    /** Audio bytes + IANA media type (e.g. "audio/webm", "audio/mp4") -> plain transcript text. */
    String transcribe(byte[] audio, String mediaType);
}
