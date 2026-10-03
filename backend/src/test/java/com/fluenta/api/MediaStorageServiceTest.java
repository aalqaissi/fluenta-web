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
        var file = new MockMultipartFile("file", "clip.ogg", "audio/ogg", new byte[]{1});
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

    // --- images (Studio passage diagrams / maps / process images) ---

    @Test
    void storesPngJpegAndWebpImages(@TempDir Path dir) {
        var svc = svc(dir);
        assertTrue(svc.store(new MockMultipartFile("file", "d.png", "image/png", new byte[]{1})).endsWith(".png"));
        assertTrue(svc.store(new MockMultipartFile("file", "d.jpg", "image/jpeg", new byte[]{1})).endsWith(".jpg"));
        assertTrue(svc.store(new MockMultipartFile("file", "d.webp", "image/webp", new byte[]{1})).endsWith(".webp"));
        // vague content-type: fall back to the file name
        assertTrue(svc.store(new MockMultipartFile("file", "map.JPEG", "application/octet-stream", new byte[]{1})).endsWith(".jpg"));
    }

    @Test
    void imagesAreCappedAtFiveMegabytes(@TempDir Path dir) {
        var svc = svc(dir);
        var big = new MockMultipartFile("file", "d.png", "image/png", new byte[5 * 1024 * 1024 + 1]);
        var ex = assertThrows(ApiException.class, () -> svc.store(big));
        assertTrue(ex.getMessage().contains("5 MB"), ex.getMessage());
    }

    @Test
    void rejectsOtherImageTypes(@TempDir Path dir) {
        var svc = svc(dir);
        var svg = new MockMultipartFile("file", "d.svg", "image/svg+xml", new byte[]{1});
        assertThrows(ApiException.class, () -> svc.store(svg));
    }

    @Test
    void rejectsEmpty(@TempDir Path dir) {
        var svc = svc(dir);
        var file = new MockMultipartFile("file", "clip.mp3", "audio/mpeg", new byte[0]);
        assertThrows(ApiException.class, () -> svc.store(file));
    }
}
