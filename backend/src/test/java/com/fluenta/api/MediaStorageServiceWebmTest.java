package com.fluenta.api;

import com.fluenta.api.service.MediaStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;

import static org.assertj.core.api.Assertions.*;

class MediaStorageServiceWebmTest {

    // MediaStorageService's constructor just takes the media dir as a String (no Spring context
    // required outside the @Value/@PostConstruct wiring); point it at a fresh temp dir that
    // already exists on disk (see MediaContractTest for the app's own construction pattern).
    private final MediaStorageService storage = newStorage();

    private static MediaStorageService newStorage() {
        try {
            return new MediaStorageService(Files.createTempDirectory("fluenta-media-webm-test").toString());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void acceptsWebmAudio() {
        var file = new MockMultipartFile("file", "clip.webm", "audio/webm", new byte[]{1, 2, 3});
        String url = storage.store(file);
        assertThat(url).endsWith(".webm");
        assertThat(storage.readAudio(url)).containsExactly(1, 2, 3);
    }

    @Test
    void rejectsUnsupportedType() {
        var file = new MockMultipartFile("file", "x.txt", "text/plain", new byte[]{1});
        assertThatThrownBy(() -> storage.store(file))
                .isInstanceOf(com.fluenta.api.web.ApiException.class);
    }
}
