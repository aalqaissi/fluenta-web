package com.fluenta.api;

import com.fluenta.api.service.MediaStorageService;
import com.fluenta.api.web.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class MediaStorageServiceTest {

    private MediaStorageService svc(Path dir) {
        return new MediaStorageService(dir.toString());
    }

    @Test
    void storesMp3AndReturnsMediaUrl(@TempDir Path dir) throws Exception {
        var svc = svc(dir);
        var file = new MockMultipartFile("file", "clip.mp3", "audio/mpeg", new byte[]{1, 2, 3});
        String url = svc.store(file);
        assertTrue(url.matches("/media/[a-f0-9-]+\\.mp3"), url);
        String name = url.substring("/media/".length());
        assertArrayEquals(new byte[]{1, 2, 3}, Files.readAllBytes(dir.resolve(name)));
    }

    @Test
    void rejectsDisallowedType(@TempDir Path dir) {
        var svc = svc(dir);
        var file = new MockMultipartFile("file", "clip.wav", "audio/wav", new byte[]{1});
        var ex = assertThrows(ApiException.class, () -> svc.store(file));
        assertEquals(400, ex.getStatus().value());
    }

    @Test
    void rejectsOversize(@TempDir Path dir) {
        var svc = svc(dir);
        byte[] big = new byte[20 * 1024 * 1024 + 1];
        var file = new MockMultipartFile("file", "clip.mp3", "audio/mpeg", big);
        var ex = assertThrows(ApiException.class, () -> svc.store(file));
        assertEquals(400, ex.getStatus().value());
    }

    @Test
    void rejectsEmpty(@TempDir Path dir) {
        var svc = svc(dir);
        var file = new MockMultipartFile("file", "clip.mp3", "audio/mpeg", new byte[0]);
        assertThrows(ApiException.class, () -> svc.store(file));
    }
}
