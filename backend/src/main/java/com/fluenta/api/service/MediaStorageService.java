package com.fluenta.api.service;

import com.fluenta.api.web.ApiException;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

/**
 * Stores uploaded media (currently Listening audio) on the local filesystem under an external,
 * writable directory (default {@code ./data/media}, sibling of the SQLite DB; override with
 * {@code FLUENTA_MEDIA_DIR}). Never the classpath — the packaged JAR's {@code /static} is read-only.
 * Files are served publicly at {@code /media/**} by {@code MediaConfig}.
 */
@Service
public class MediaStorageService {

    private static final long MAX_BYTES = 20L * 1024 * 1024; // 20 MB
    // content-type -> extension. Only MP3 and M4A/AAC.
    private static final Map<String, String> ALLOWED = Map.of(
            "audio/mpeg", "mp3",
            "audio/mp4", "m4a",
            "audio/x-m4a", "m4a",
            "audio/aac", "aac"
    );

    private final Path dir;

    public MediaStorageService(@Value("${fluenta.media.dir:./data/media}") String dir) {
        this.dir = Path.of(dir).toAbsolutePath().normalize();
    }

    @PostConstruct
    void ensureDir() {
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create media dir: " + dir, e);
        }
    }

    /** Resource-handler location, e.g. {@code file:/abs/data/media/}. */
    public String location() {
        return dir.toUri().toString(); // ends with '/'
    }

    /** Validate and store; returns the public relative URL {@code /media/<uuid>.<ext>}. */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("No file uploaded");
        if (file.getSize() > MAX_BYTES) throw ApiException.badRequest("Audio exceeds the 20 MB limit");
        String ext = resolveExt(file);
        String name = UUID.randomUUID() + "." + ext;
        try {
            Files.write(dir.resolve(name), file.getBytes());
        } catch (IOException e) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Could not store the file");
        }
        return "/media/" + name;
    }

    private String resolveExt(MultipartFile file) {
        String ct = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String ext = ALLOWED.get(ct);
        if (ext != null) return ext;
        // fall back to filename extension when the browser sends a vague content-type
        String fn = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (fn.endsWith(".mp3")) return "mp3";
        if (fn.endsWith(".m4a")) return "m4a";
        if (fn.endsWith(".aac")) return "aac";
        throw ApiException.badRequest("Only MP3 or M4A/AAC audio is allowed");
    }
}
