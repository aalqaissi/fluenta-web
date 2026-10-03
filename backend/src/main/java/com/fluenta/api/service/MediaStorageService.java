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
 * Stores uploaded media (Listening/Speaking audio and Studio passage images) on the local filesystem under an external,
 * writable directory (default {@code ./data/media}, sibling of the SQLite DB; override with
 * {@code FLUENTA_MEDIA_DIR}). Never the classpath — the packaged JAR's {@code /static} is read-only.
 * Files are served publicly at {@code /media/**} by {@code MediaConfig}.
 */
@Service
public class MediaStorageService {

    private static final long MAX_BYTES = 20L * 1024 * 1024; // 20 MB (audio)
    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024; // 5 MB (images)
    // content-type -> extension. MP3, M4A/AAC (listening), WEBM/WAV (speaking recordings), and
    // PNG/JPEG/WebP images (Studio passage diagrams, maps, process images). SVG is refused (scriptable).
    private static final Map<String, String> ALLOWED = Map.of(
            "audio/mpeg", "mp3",
            "audio/mp4", "m4a",
            "audio/x-m4a", "m4a",
            "audio/aac", "aac",
            "audio/webm", "webm",
            "audio/wav", "wav",
            "image/png", "png",
            "image/jpeg", "jpg",
            "image/webp", "webp"
    );
    private static final java.util.Set<String> IMAGE_EXTS = java.util.Set.of("png", "jpg", "webp");

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
        String ext = resolveExt(file);
        if (IMAGE_EXTS.contains(ext) && file.getSize() > MAX_IMAGE_BYTES) throw ApiException.badRequest("Image exceeds the 5 MB limit");
        if (file.getSize() > MAX_BYTES) throw ApiException.badRequest("Audio exceeds the 20 MB limit");
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
        if (fn.endsWith(".webm")) return "webm";
        if (fn.endsWith(".wav")) return "wav";
        if (fn.endsWith(".png")) return "png";
        if (fn.endsWith(".jpg") || fn.endsWith(".jpeg")) return "jpg";
        if (fn.endsWith(".webp")) return "webp";
        throw ApiException.badRequest("Only MP3, M4A/AAC or WEBM/WAV audio, or PNG/JPEG/WebP images, are allowed");
    }

    /** Resolve a stored "/media/<name>" URL to bytes on disk. Rejects path escapes. */
    public byte[] readAudio(String url) {
        Path p = resolve(url);
        try {
            return Files.readAllBytes(p);
        } catch (IOException e) {
            throw ApiException.badRequest("Audio file not found");
        }
    }

    /** Best-effort delete of a stored "/media/<name>" file. Never throws. */
    public void deleteQuietly(String url) {
        try { Files.deleteIfExists(resolve(url)); } catch (Exception ignored) {}
    }

    /** Map a "/media/<name>" URL to its on-disk path under the media root; reject traversal. */
    private Path resolve(String url) {
        String name = url == null ? "" : url.replaceFirst("^/?media/", "");
        Path base = this.dir.toAbsolutePath().normalize();
        Path p = base.resolve(name).normalize();
        if (!p.startsWith(base)) throw ApiException.badRequest("Invalid media path");
        return p;
    }
}
