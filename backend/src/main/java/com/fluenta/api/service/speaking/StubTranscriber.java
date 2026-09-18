package com.fluenta.api.service.speaking;

import org.springframework.stereotype.Component;

/** Offline/free STT: a deterministic placeholder transcript (no network). Standalone so it is
 *  NOT a second com.fluenta.api.service.Transcriber bean (keeps the SP4 @MockBean unambiguous). */
@Component
public class StubTranscriber {
    public String transcribe(byte[] audio, String mediaType) {
        return "[offline transcript placeholder — connect the speech service to transcribe your recording]";
    }
}
