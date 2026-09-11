# Listening Audio Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin upload a Listening audio clip in the Content Studio, store it on the server, and have both the web and mobile Listening runners stream and play it — replacing simulated playback.

**Architecture:** A generic `POST /api/media` endpoint writes uploads to an external, writable dir (`./data/media/`, sibling of the SQLite DB) and returns a relative `/media/<uuid>.<ext>` URL; a new resource handler serves `/media/**` publicly with HTTP range support. `audioUrl` becomes an optional field on each Listening section inside the exam's opaque JSON `content` blob (no DB/entity change). Studio writes it; both runners resolve it against their API origin and play it, falling back to the existing simulated ticker when absent.

**Tech Stack:** Spring Boot 3.3.5 (Java 21, MockMvc tests) · React 18 + TypeScript + Vite (no unit-test runner — verify via `tsc`/`vite build`/browser) · Flutter (Dart, `just_audio`, `flutter test`).

## Global Constraints

- Upload gate: `CurrentUser.require()` only — **no new roles** (reuse the Content Studio admin surface).
- Allowed audio: **MP3 and M4A/AAC only** (`.mp3`, `.m4a`, `.aac`; content-types `audio/mpeg`, `audio/mp4`, `audio/aac`, `audio/x-m4a`). Reject others.
- **Size cap 20 MB** per clip (service-enforced); multipart backstop 25 MB.
- **One clip per section**; re-upload replaces (a new uuid; old file may be left orphaned — acceptable this stage).
- `audioUrl` stored as a **relative path** `/media/<uuid>.<ext>`; clients resolve it against their API origin (base URL minus trailing `/api`).
- Media served at `/media/**` — **outside `/api`**, so it stays public and untouched by `AuthFilter`.
- Backward compatible: sections without `audioUrl` behave exactly as today (simulated).
- Env override for storage dir: `FLUENTA_MEDIA_DIR` (default `./data/media`).
- **This machine cannot bind the server** (Java NIO loopback blocked); backend verification is MockMvc in-process (`mvn -q -DforkCount=0 test`).

---

## File Structure

**Backend (`backend/src/main/java/com/fluenta/api/`)**
- Create `service/MediaStorageService.java` — resolves/creates the media dir, validates + writes uploads, exposes the serving location.
- Create `web/MediaController.java` — `POST /api/media` multipart endpoint.
- Create `config/MediaConfig.java` — `/media/**` static resource handler.
- Modify `web/ApiException.java` — add `badRequest(...)` factory.
- Modify `web/GlobalExceptionHandler.java` — map `MaxUploadSizeExceededException` → 400.
- Modify `src/main/resources/application.yml` — multipart limits + `fluenta.media.dir`.
- Create `src/test/java/com/fluenta/api/MediaContractTest.java` — MockMvc upload + serve tests.

**Web (`src/`)**
- Modify `lib/api.ts` — `api.media.upload(file)` + `resolveMedia(path)` + `MEDIA_ORIGIN`.
- Modify `mock/types.ts` — `ListeningSectionRun.audioUrl?`.
- Modify `features/studio/store.ts` — `StudioSection.audioUrl` + `audioDurationSec?`, update `newSection`.
- Modify `features/studio/convert.ts` — carry `audioUrl` + `audioDurationSec` into `studioListeningToExam`.
- Create `features/studio/AudioUpload.tsx` — real file upload + client-side duration read.
- Modify `features/studio/editors/ListeningEditor.tsx` — use `AudioUpload`.
- Modify `features/exam-runner/AudioPlayer.tsx` — optional `src` → real `<audio>` playback.
- Modify `features/exam-runner/ListeningRunnerPage.tsx` — pass `src={resolveMedia(section.audioUrl)}`.

**Mobile (`fluenta-mobile/`)**
- Modify `pubspec.yaml` — add `just_audio`.
- Modify `lib/models/models.dart` — `ListeningRunSection.audioUrl`.
- Modify `lib/services/exam_convert.dart` — map `audioUrl`.
- Modify `lib/config/app_config.dart` — `mediaBase` getter.
- Create `lib/features/listening/section_audio_player.dart` — real/fallback player widget.
- Modify `lib/features/listening/listening_runner_screen.dart` — embed the widget.
- Modify `test/exam_convert_test.dart` — assert `audioUrl` mapping.

---

## Task 1: Backend — MediaStorageService

**Files:**
- Create: `backend/src/main/java/com/fluenta/api/service/MediaStorageService.java`
- Modify: `backend/src/main/java/com/fluenta/api/web/ApiException.java`
- Modify: `backend/src/main/resources/application.yml`
- Test: `backend/src/test/java/com/fluenta/api/MediaStorageServiceTest.java`

**Interfaces:**
- Produces: `MediaStorageService.store(MultipartFile file) : String` returns `/media/<uuid>.<ext>`; `MediaStorageService.location() : String` returns `file:<absolute-dir>/` (trailing slash) for the resource handler; throws `ApiException(BAD_REQUEST, msg)` on bad type/empty/oversize.
- Consumes: config property `fluenta.media.dir` (default `./data/media`).

- [ ] **Step 1: Add the `badRequest` factory to ApiException**

In `web/ApiException.java`, add next to `notFound`:

```java
    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }
```

- [ ] **Step 2: Add media dir + multipart config to application.yml**

Under `spring:` add the multipart block, and add a `fluenta.media` block (merge into the existing `fluenta:` key — do not duplicate it):

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 25MB
      max-request-size: 25MB

fluenta:
  media:
    dir: ${FLUENTA_MEDIA_DIR:./data/media}
```

- [ ] **Step 3: Write the failing test**

Create `MediaStorageServiceTest.java`:

```java
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
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd backend && mvn -q -DforkCount=0 -Dtest=MediaStorageServiceTest test`
Expected: FAIL — `MediaStorageService` does not exist (compilation error).

- [ ] **Step 5: Implement MediaStorageService**

Create `service/MediaStorageService.java`:

```java
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
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && mvn -q -DforkCount=0 -Dtest=MediaStorageServiceTest test`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/fluenta/api/service/MediaStorageService.java \
        backend/src/main/java/com/fluenta/api/web/ApiException.java \
        backend/src/main/resources/application.yml \
        backend/src/test/java/com/fluenta/api/MediaStorageServiceTest.java
git commit -m "feat(backend): media storage service with type/size validation"
```

---

## Task 2: Backend — upload endpoint + `/media/**` serving

**Files:**
- Create: `backend/src/main/java/com/fluenta/api/web/MediaController.java`
- Create: `backend/src/main/java/com/fluenta/api/config/MediaConfig.java`
- Modify: `backend/src/main/java/com/fluenta/api/web/GlobalExceptionHandler.java`
- Test: `backend/src/test/java/com/fluenta/api/MediaContractTest.java`

**Interfaces:**
- Consumes: `MediaStorageService.store(...)`, `MediaStorageService.location()` (Task 1).
- Produces: `POST /api/media` (multipart field `file`, requires auth) → `{ "url": "/media/<uuid>.<ext>" }`; `GET /media/<name>` serves the bytes (public, range-capable).

- [ ] **Step 1: Write the failing MockMvc test**

Create `MediaContractTest.java` (media dir pointed at a temp path via property):

```java
package com.fluenta.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "fluenta.media.dir=${java.io.tmpdir}/fluenta-media-test")
class MediaContractTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private String login() throws Exception {
        MvcResult res = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"sara.hamzeh@example.com\"}"))
                .andExpect(status().isOk()).andReturn();
        return om.readTree(res.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void uploadRequiresAuth() throws Exception {
        mvc.perform(multipart("/api/media")
                        .file(new MockMultipartFile("file", "c.mp3", "audio/mpeg", new byte[]{1})))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void uploadStoresAndServesWithRange() throws Exception {
        String token = login();
        byte[] bytes = "ID3-fake-audio-bytes".getBytes();
        MvcResult up = mvc.perform(multipart("/api/media")
                        .file(new MockMultipartFile("file", "c.mp3", "audio/mpeg", bytes))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.startsWith("/media/")))
                .andReturn();
        String url = om.readTree(up.getResponse().getContentAsString()).get("url").asText();

        // served publicly (no auth header), full body
        mvc.perform(get(url)).andExpect(status().isOk());

        // range request is honored (206 Partial Content)
        mvc.perform(get(url).header("Range", "bytes=0-3"))
                .andExpect(status().isPartialContent());
    }

    @Test
    void rejectsWrongType() throws Exception {
        String token = login();
        mvc.perform(multipart("/api/media")
                        .file(new MockMultipartFile("file", "c.wav", "audio/wav", new byte[]{1}))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void missingMediaReturns404NotSpaShell() throws Exception {
        mvc.perform(get("/media/does-not-exist.mp3")).andExpect(status().isNotFound());
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && mvn -q -DforkCount=0 -Dtest=MediaContractTest test`
Expected: FAIL — no `/api/media` route (401/404 mismatches) and no `/media/**` handler.

- [ ] **Step 3: Implement the controller**

Create `web/MediaController.java`:

```java
package com.fluenta.api.web;

import com.fluenta.api.config.CurrentUser;
import com.fluenta.api.service.MediaStorageService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/** Generic authenticated media upload (Listening audio today; reusable later). */
@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final MediaStorageService storage;

    public MediaController(MediaStorageService storage) {
        this.storage = storage;
    }

    @PostMapping(consumes = "multipart/form-data")
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) {
        CurrentUser.require();
        return Map.of("url", storage.store(file));
    }
}
```

- [ ] **Step 4: Implement the `/media/**` resource handler**

Create `config/MediaConfig.java`:

```java
package com.fluenta.api.config;

import com.fluenta.api.service.MediaStorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serves uploaded media from the external media dir at {@code /media/**} — a more specific pattern
 * than SpaConfig's {@code /**}, so it wins, and being outside {@code /api} it stays public
 * (AuthFilter ignores non-api paths). Spring's ResourceHttpRequestHandler supports HTTP range
 * requests, so audio scrubbing works; a missing file yields a normal 404.
 */
@Configuration
public class MediaConfig implements WebMvcConfigurer {

    private final MediaStorageService storage;

    public MediaConfig(MediaStorageService storage) {
        this.storage = storage;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/media/**")
                .addResourceLocations(storage.location());
    }
}
```

- [ ] **Step 5: Map oversize uploads to 400**

In `web/GlobalExceptionHandler.java`, add an import and handler:

```java
import org.springframework.web.multipart.MaxUploadSizeExceededException;
```

```java
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleTooLarge(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Audio exceeds the 20 MB limit", "status", 400));
    }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && mvn -q -DforkCount=0 -Dtest=MediaContractTest test`
Expected: PASS (4 tests).

- [ ] **Step 7: Run the full backend suite (no regressions)**

Run: `cd backend && mvn -q -DforkCount=0 test`
Expected: PASS (existing `HttpContractTest` + new media tests).

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/fluenta/api/web/MediaController.java \
        backend/src/main/java/com/fluenta/api/config/MediaConfig.java \
        backend/src/main/java/com/fluenta/api/web/GlobalExceptionHandler.java \
        backend/src/test/java/com/fluenta/api/MediaContractTest.java
git commit -m "feat(backend): POST /api/media upload + public /media/** serving"
```

---

## Task 3: Web — types, API client, converter

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/mock/types.ts:156-165` (`ListeningSectionRun`)
- Modify: `src/features/studio/store.ts` (`StudioSection`, `newSection`)
- Modify: `src/features/studio/convert.ts:120-127` (`studioListeningToExam` section mapping)

**Interfaces:**
- Produces: `api.media.upload(file: File): Promise<{ url: string }>`; `resolveMedia(path?: string | null): string | undefined`; `StudioSection.audioUrl: string | null`; `StudioSection.audioDurationSec?: number`; `ListeningSectionRun.audioUrl?: string`.
- Consumes: `POST /api/media` (Task 2), `API_BASE` (existing).

> **Verification note:** the web app has no unit-test runner (only `tsc`). These tasks verify with `npm run lint` (type-check) + `npm run build`, then browser preview in Task 4/5.

- [ ] **Step 1: Add `MEDIA_ORIGIN`, `resolveMedia`, and `api.media` to api.ts**

After the `API_BASE` definition (line 17) add:

```typescript
/** Server origin for static media (`/media/**`), i.e. API_BASE without the trailing `/api`. */
export const MEDIA_ORIGIN: string = API_BASE.replace(/\/api\/?$/, "");

/** Resolve a stored relative media path (`/media/x.mp3`) to an absolute URL. */
export function resolveMedia(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${MEDIA_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}
```

Add an `upload` helper (multipart — do NOT set Content-Type; the browser sets the boundary). Place it after the `request` function (after line 81):

```typescript
async function uploadFile<T>(path: string, file: File): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: form });
  } catch {
    throw new ApiError(0, `Cannot reach the Yalla English Hub API at ${API_BASE}. Is the backend running?`);
  }
  if (res.status === 401) {
    setToken(null);
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }
  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try { const d = await res.json(); if (d?.error) msg = d.error; } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as T;
}
```

Then add a `media` group to the `api` object (alongside `exams`, before the closing `}`):

```typescript
  media: {
    upload: (file: File) => uploadFile<{ url: string }>("/media", file),
  },
```

- [ ] **Step 2: Add `audioUrl` to the runtime listening section type**

In `src/mock/types.ts`, inside `interface ListeningSectionRun` (after `audioDurationSec`):

```typescript
  /** absolute-or-relative URL of the real section audio; undefined = simulated */
  audioUrl?: string;
```

- [ ] **Step 3: Add `audioUrl` + `audioDurationSec` to StudioSection**

In `src/features/studio/store.ts`, extend `interface StudioSection` (after `audioName`):

```typescript
  audioUrl: string | null;
  audioDurationSec?: number;
```

And update `newSection`:

```typescript
export function newSection(n: number): StudioSection {
  return { id: uid(), title: `Section ${n}`, audioName: null, audioUrl: null, imageName: null, transcript: "", questionType: "sentence-completion", questions: [] };
}
```

(No change needed to `toStudioExam`/`toExamDto` — sections pass through `content` verbatim, so the new fields round-trip automatically.)

- [ ] **Step 4: Carry the fields through the converter**

In `src/features/studio/convert.ts`, in `studioListeningToExam`, change the returned section object (lines ~120-127) to:

```typescript
    return {
      id: s.id,
      number: si + 1,
      context: s.title || `Section ${si + 1}`,
      difficulty: "Medium",
      audioDurationSec: s.audioDurationSec ?? 60,
      audioUrl: s.audioUrl ?? undefined,
      group,
    };
```

- [ ] **Step 5: Type-check and build**

Run: `npm run lint && npm run build`
Expected: PASS (no type errors).

- [ ] **Step 6: Commit**

```bash
git add src/lib/api.ts src/mock/types.ts src/features/studio/store.ts src/features/studio/convert.ts
git commit -m "feat(web): audioUrl on listening sections + media upload client"
```

---

## Task 4: Web — Studio audio upload UI

**Files:**
- Create: `src/features/studio/AudioUpload.tsx`
- Modify: `src/features/studio/editors/ListeningEditor.tsx:52-55`

**Interfaces:**
- Consumes: `api.media.upload` (Task 3), `resolveMedia` (Task 3), `StudioSection.audioUrl/audioName/audioDurationSec` (Task 3).
- Produces: `<AudioUpload value={{url,name}|null} onUploaded={(r:{url:string;name:string;durationSec:number})=>void} onRemove={()=>void} />`.

- [ ] **Step 1: Create the AudioUpload component**

Create `src/features/studio/AudioUpload.tsx`. It renders a real file input, reads the clip duration client-side (hidden `Audio`), uploads, and reports back. Preview uses the resolved URL.

```tsx
import { useRef, useState } from "react";
import { UploadCloud, FileAudio, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, resolveMedia } from "@/lib/api";

const ACCEPT = ".mp3,.m4a,.aac,audio/mpeg,audio/mp4,audio/aac,audio/x-m4a";
const MAX_BYTES = 20 * 1024 * 1024;

/** Read a media file's duration (seconds, rounded) in the browser. Resolves 0 on failure. */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("audio");
    el.preload = "metadata";
    el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Math.round(el.duration) || 0); };
    el.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    el.src = url;
  });
}

export function AudioUpload({
  value,
  onUploaded,
  onRemove,
}: {
  value: { url: string; name: string } | null;
  onUploaded: (r: { url: string; name: string; durationSec: number }) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) { toast.error("Audio exceeds the 20 MB limit"); return; }
    setBusy(true);
    try {
      const durationSec = await readDuration(file);
      const { url } = await api.media.upload(file);
      onUploaded({ url, name: file.name, durationSec });
      toast.success("Audio uploaded");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileAudio className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{value.name}</p>
            <audio controls preload="none" src={resolveMedia(value.url)} className="mt-1 h-8 w-full" />
          </div>
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label="Remove audio">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 text-center transition-colors hover:border-primary disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-7 animate-spin text-primary" /> : <UploadCloud className="size-7 text-muted-foreground" />}
          <span className="text-sm font-semibold">{busy ? "Uploading…" : "Drop an audio file, or click to browse"}</span>
          <span className="text-xs text-muted-foreground">MP3 or M4A/AAC · up to 20MB</span>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Use AudioUpload in the Listening editor**

In `src/features/studio/editors/ListeningEditor.tsx`, add the import:

```tsx
import { AudioUpload } from "../AudioUpload";
```

Replace the `Field label="Section audio"` block (lines ~52-55) with:

```tsx
              <Field label="Section audio" hint="Upload the original recording (MP3 or M4A/AAC).">
                <AudioUpload
                  value={s.audioUrl ? { url: s.audioUrl, name: s.audioName ?? "audio" } : null}
                  onUploaded={(r) => setS(idx, { audioUrl: r.url, audioName: r.name, audioDurationSec: r.durationSec || undefined })}
                  onRemove={() => setS(idx, { audioUrl: null, audioName: null, audioDurationSec: undefined })}
                />
              </Field>
```

(Leave the existing `MediaDrop` import in place — it is still used for the section image below.)

- [ ] **Step 3: Type-check and build**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 4: Browser verification**

Ensure a dev preview is running (`preview_start` with the frontend dev server), sign in, open the Content Studio, create/edit a Listening exam. Verify:
- The "Section audio" control shows the upload dropzone.
- (If the backend is reachable in the preview) picking a small MP3 shows "Uploading…" then a filename + inline `<audio controls>`. If the backend is not bindable in this environment, verify the UI states and that the POST targets `/media` via `read_network_requests`.
Capture a screenshot of the editor with the audio control.

- [ ] **Step 5: Commit**

```bash
git add src/features/studio/AudioUpload.tsx src/features/studio/editors/ListeningEditor.tsx
git commit -m "feat(web): real audio upload in the Studio listening editor"
```

---

## Task 5: Web — real playback in the runner

**Files:**
- Modify: `src/features/exam-runner/AudioPlayer.tsx`
- Modify: `src/features/exam-runner/ListeningRunnerPage.tsx:175`

**Interfaces:**
- Consumes: `resolveMedia` (Task 3), `ListeningSectionRun.audioUrl` (Task 3).
- Produces: `<AudioPlayer durationSec src? playOnce />` — real `<audio>` when `src` is set, simulated otherwise; play-once lock preserved.

- [ ] **Step 1: Add an optional `src` (real audio) path to AudioPlayer**

In `src/features/exam-runner/AudioPlayer.tsx`, extend `Props`:

```tsx
interface Props {
  /** length of the recording in seconds (fallback/label; real audio overrides once loaded) */
  durationSec: number;
  /** when set, play this real audio file instead of simulating */
  src?: string;
  /** enforce the real-test rule: the audio may be played only once */
  playOnce?: boolean;
}
```

Change the signature to `export function AudioPlayer({ durationSec, src, playOnce = false }: Props)`. Add a real-audio branch that reuses the existing waveform UI. Insert an `<audio>` ref and effects, and drive `t`/`total`/`plays` from the element when `src` is present:

```tsx
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [realDur, setRealDur] = useState(0);

  // Real-audio effect: wire element events to the same t/plays/playing state.
  useEffect(() => {
    if (!src) return;
    const el = audioRef.current;
    if (!el) return;
    const onLoaded = () => setRealDur(Math.round(el.duration) || 0);
    const onTime = () => setT(Math.floor(el.currentTime));
    const onEnd = () => { setPlaying(false); setPlays((p) => p + 1); setT(Math.round(el.duration) || total); };
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, [src, total]);
```

Guard the existing simulated interval so it only runs without `src`:

```tsx
  useEffect(() => {
    if (src) return;              // real audio drives its own progress
    if (!playing) { ... }         // (leave the existing body unchanged)
    ...
  }, [playing, total, src]);
```

Make `total` prefer the real duration when known:

```tsx
  const total = Math.max(1, src && realDur ? realDur : durationSec);
```

Update `toggle` to control the element when `src` is set:

```tsx
  function toggle() {
    if (locked) return;
    if (src) {
      const el = audioRef.current;
      if (!el) return;
      if (playing) { el.pause(); setPlaying(false); }
      else { if (t >= total) { el.currentTime = 0; setT(0); } el.play(); setPlaying(true); }
      return;
    }
    if (!playing && t >= total) setT(0);
    setPlaying((p) => !p);
  }
```

Render the hidden element (inside the root `<div>`, e.g. right after the opening tag) and update the caption:

```tsx
      {src && <audio ref={audioRef} src={src} preload="metadata" className="hidden" />}
```

```tsx
      <p className="mt-3 text-xs text-muted-foreground">
        {playOnce
          ? `Audio played ${Math.min(plays, 1)} of 1 time${locked ? " — playback is now locked, just like the real test." : src ? "." : ". In the real test it plays once."}`
          : src ? "Section audio." : "Preview player — playback is simulated."}
      </p>
```

- [ ] **Step 2: Pass the resolved src from the runner**

In `src/features/exam-runner/ListeningRunnerPage.tsx`, add `resolveMedia` to the api import (line 5):

```tsx
import { api, ApiError, resolveMedia } from "@/lib/api";
```

Change the AudioPlayer usage (line 175):

```tsx
          <AudioPlayer key={section.id} durationSec={section.audioDurationSec} src={resolveMedia(section.audioUrl)} playOnce />
```

- [ ] **Step 3: Type-check and build**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 4: Browser verification**

In the preview, open a Listening exam that has an uploaded clip (or temporarily point a section's `audioUrl` at any reachable audio URL). Verify: Play starts real audio, the waveform tracks real position, times show the real duration, and after it ends the button locks (play-once). A section with no `audioUrl` still shows the simulated player. Screenshot the runner mid-playback.

- [ ] **Step 5: Commit**

```bash
git add src/features/exam-runner/AudioPlayer.tsx src/features/exam-runner/ListeningRunnerPage.tsx
git commit -m "feat(web): play real section audio in the listening runner"
```

---

## Task 6: Mobile — model, converter, config, dependency

**Files:**
- Modify: `fluenta-mobile/pubspec.yaml`
- Modify: `fluenta-mobile/lib/models/models.dart:717-728` (`ListeningRunSection`)
- Modify: `fluenta-mobile/lib/services/exam_convert.dart:35-40`
- Modify: `fluenta-mobile/lib/config/app_config.dart`
- Test: `fluenta-mobile/test/exam_convert_test.dart`

**Interfaces:**
- Produces: `ListeningRunSection.audioUrl` (`String?`); `AppConfig.mediaBase` (`String`, `serverUrl` minus trailing `/api`); converter maps `content.sections[].audioUrl`.

- [ ] **Step 1: Add the just_audio dependency**

Run: `cd D:/personal/fluenta-mobile && flutter pub add just_audio`
Expected: `pubspec.yaml` gains `just_audio: ^<resolved>` and `pubspec.lock` updates. (No AndroidManifest change — `usesCleartextTraffic="true"` and `INTERNET` are already present.)

- [ ] **Step 2: Write the failing converter test**

In `fluenta-mobile/test/exam_convert_test.dart`, add:

```dart
  test('listening section carries audioUrl when present', () {
    final exam = listeningExamFromContent({
      'sections': [
        {'number': 1, 'context': 'Intro', 'audioDurationSec': 90, 'audioUrl': '/media/abc.mp3', 'group': {}},
        {'number': 2, 'context': 'Next', 'audioDurationSec': 60, 'group': {}},
      ],
    });
    expect(exam.sections[0].audioUrl, '/media/abc.mp3');
    expect(exam.sections[1].audioUrl, isNull);
  });
```

(Ensure `listeningExamFromContent` is imported at the top of the test file if not already.)

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd D:/personal/fluenta-mobile && flutter test test/exam_convert_test.dart`
Expected: FAIL — `audioUrl` is not a member of `ListeningRunSection`.

- [ ] **Step 4: Add `audioUrl` to the model**

In `fluenta-mobile/lib/models/models.dart`, in `class ListeningRunSection` add the field and constructor param:

```dart
  final String? audioUrl;
```

```dart
  const ListeningRunSection({
    required this.number,
    required this.context,
    required this.audioDurationSec,
    this.audioUrl,
    required this.group,
  });
```

- [ ] **Step 5: Map it in the converter**

In `fluenta-mobile/lib/services/exam_convert.dart`, update `_listeningSection`:

```dart
ListeningRunSection _listeningSection(Map<String, dynamic> s) => ListeningRunSection(
      number: (s['number'] as num?)?.toInt() ?? 1,
      context: (s['context'] as String?) ?? '',
      audioDurationSec: (s['audioDurationSec'] as num?)?.toInt() ?? 60,
      audioUrl: s['audioUrl'] as String?,
      group: _group(Map<String, dynamic>.from((s['group'] as Map?) ?? const {})),
    );
```

- [ ] **Step 6: Add `mediaBase` to AppConfig**

In `fluenta-mobile/lib/config/app_config.dart`, add a getter:

```dart
  /// Server origin for static media (`/media/**`): serverUrl without the trailing `/api`.
  String get mediaBase => serverUrl.replaceFirst(RegExp(r'/api/?$'), '');
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd D:/personal/fluenta-mobile && flutter test test/exam_convert_test.dart`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
cd D:/personal/fluenta-mobile
git add pubspec.yaml pubspec.lock lib/models/models.dart lib/services/exam_convert.dart lib/config/app_config.dart test/exam_convert_test.dart
git commit -m "feat(mobile): audioUrl on listening sections + just_audio + mediaBase"
```

---

## Task 7: Mobile — real playback widget in the runner

**Files:**
- Create: `fluenta-mobile/lib/features/listening/section_audio_player.dart`
- Modify: `fluenta-mobile/lib/features/listening/listening_runner_screen.dart`

**Interfaces:**
- Consumes: `just_audio.AudioPlayer`, `ListeningRunSection.audioUrl`, `AppConfig.mediaBase`.
- Produces: `SectionAudioPlayer({ required String? audioUrl, required int durationSec, required bool alreadyPlayed, required VoidCallback onCompleted })` — a self-contained play-once player: real streaming when `audioUrl != null`, the existing simulated ticker otherwise.

- [ ] **Step 1: Create the SectionAudioPlayer widget**

Create `fluenta-mobile/lib/features/listening/section_audio_player.dart`. When `audioUrl` is null it reproduces the current simulated ticker exactly; when set it streams via `just_audio` and reports completion. It calls `onCompleted` once when playback finishes (so the runner can mark the section played).

```dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import '../../theme/app_colors.dart';
import '../../utils/format.dart';
import '../../widgets/ui.dart';

/// Play-once section audio. Streams a real clip when [audioUrl] is set; otherwise
/// falls back to a simulated timer (no sound), preserving the prototype behavior.
class SectionAudioPlayer extends StatefulWidget {
  final String? audioUrl; // fully-resolved URL (mediaBase + path), or null
  final int durationSec;
  final bool alreadyPlayed;
  final VoidCallback onCompleted;
  const SectionAudioPlayer({
    super.key,
    required this.audioUrl,
    required this.durationSec,
    required this.alreadyPlayed,
    required this.onCompleted,
  });

  @override
  State<SectionAudioPlayer> createState() => _SectionAudioPlayerState();
}

class _SectionAudioPlayerState extends State<SectionAudioPlayer> {
  AudioPlayer? _player;
  StreamSubscription? _posSub;
  StreamSubscription? _stateSub;
  Timer? _simTimer;
  int _t = 0;
  int _realDur = 0;
  bool _playing = false;
  bool _played = false;
  String? _error;

  bool get _isReal => widget.audioUrl != null;
  int get _total => (_isReal && _realDur > 0) ? _realDur : (widget.durationSec > 0 ? widget.durationSec : 1);

  @override
  void initState() {
    super.initState();
    _played = widget.alreadyPlayed;
    if (_isReal) _initReal();
  }

  Future<void> _initReal() async {
    final p = AudioPlayer();
    _player = p;
    _posSub = p.positionStream.listen((d) {
      if (mounted) setState(() => _t = d.inSeconds);
    });
    _stateSub = p.playerStateStream.listen((st) {
      if (!mounted) return;
      if (st.processingState == ProcessingState.completed) {
        setState(() { _playing = false; _played = true; });
        p.pause();
        p.seek(Duration.zero);
        widget.onCompleted();
      } else {
        setState(() => _playing = st.playing);
      }
    });
    try {
      final dur = await p.setUrl(widget.audioUrl!);
      if (mounted && dur != null) setState(() => _realDur = dur.inSeconds);
    } catch (_) {
      if (mounted) setState(() => _error = 'Audio unavailable');
    }
  }

  void _toggle() {
    if (_played) return;
    if (_isReal) {
      final p = _player;
      if (p == null || _error != null) return;
      _playing ? p.pause() : p.play();
      return;
    }
    // simulated fallback: count once to the end
    if (_playing) return;
    setState(() { _playing = true; _t = 0; });
    _simTimer?.cancel();
    _simTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_t >= _total) {
        _simTimer?.cancel();
        setState(() { _playing = false; _played = true; });
        widget.onCompleted();
      } else {
        setState(() => _t++);
      }
    });
  }

  @override
  void dispose() {
    _posSub?.cancel();
    _stateSub?.cancel();
    _simTimer?.cancel();
    _player?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = _played ? 1.0 : (_t / _total).clamp(0.0, 1.0);
    final dur = _total;
    return FluentaCard(
      child: Column(children: [
        Row(children: [
          FilledButton(
            style: FilledButton.styleFrom(
                shape: const CircleBorder(), minimumSize: const Size(52, 52), padding: EdgeInsets.zero,
                backgroundColor: _played ? AppColors.mutedForeground : AppColors.primary),
            onPressed: (_played || _error != null) ? null : _toggle,
            child: Icon(
              _played ? Icons.check_rounded : (_playing ? Icons.pause_rounded : Icons.play_arrow_rounded),
              size: 26,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(children: [
              SizedBox(
                height: 30,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: List.generate(40, (i) {
                    final active = (i / 40) <= progress;
                    final h = 6 + ((i * 7) % 22).toDouble();
                    return Expanded(
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 0.8),
                        height: h,
                        decoration: BoxDecoration(
                          color: active ? AppColors.primary : AppColors.border,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 4),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text('${pad2(_t ~/ 60)}:${pad2(_t % 60)}',
                    style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
                Text('${pad2(dur ~/ 60)}:${pad2(dur % 60)}',
                    style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
              ]),
            ]),
          ),
        ]),
        const SizedBox(height: 8),
        Text(
          _error ??
              (_played
                  ? 'Audio played. In the real test each section plays once.'
                  : _isReal
                      ? 'The audio plays once.'
                      : 'The audio plays once — playback is simulated in this preview.'),
          style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground),
        ),
      ]),
    );
  }
}
```

- [ ] **Step 2: Embed the widget in the runner and drop the inline audio state**

In `fluenta-mobile/lib/features/listening/listening_runner_screen.dart`:

Add the imports:

```dart
import '../../config/app_config.dart';
import 'section_audio_player.dart';
```

Remove the now-unused inline audio fields and methods: `_audioT`, `_playing`, `_audioTimer`, `_playAudio()`, and the whole `_audioCard()` method. In `_gotoSection` drop the `_audioTimer?.cancel()` and the `_playing`/`_audioT` resets (keep `_sIdx`); in `_submit` drop `_audioTimer?.cancel()`. Keep the `_played` set (now updated via the widget callback).

Replace the `_audioCard()` call in `build` (in the section `ListView`) with a keyed `SectionAudioPlayer`:

```dart
              SectionAudioPlayer(
                key: ValueKey('audio-$_sIdx'),
                audioUrl: _resolvedAudioUrl(context),
                durationSec: _section.audioDurationSec,
                alreadyPlayed: _played.contains(_sIdx),
                onCompleted: () => setState(() => _played.add(_sIdx)),
              ),
```

Add a resolver helper that prefixes the section's relative `audioUrl` with the configured media origin:

```dart
  String? _resolvedAudioUrl(BuildContext context) {
    final path = _section.audioUrl;
    if (path == null) return null;
    if (path.startsWith('http')) return path;
    return '${context.read<AuthState>().api.config.mediaBase}$path';
  }
```

(`provider`'s `context.read` and `AuthState` are already imported in this file.)

- [ ] **Step 3: Analyze + run the full mobile test suite**

Run: `cd D:/personal/fluenta-mobile && flutter analyze && flutter test`
Expected: analyze clean (no references to the removed fields), all tests pass.

- [ ] **Step 4: Build the APK (smoke) + manual WiFi check**

Run: `cd D:/personal/fluenta-mobile && flutter build apk --debug`
Expected: build succeeds. Manual: install on a device, set the Server URL to a reachable host, open a Listening exam with an uploaded clip → real audio streams and plays once; a clip-less section still shows the simulated player. (This machine can't bind the server, so run the backend on a host that can.)

- [ ] **Step 5: Commit**

```bash
cd D:/personal/fluenta-mobile
git add lib/features/listening/section_audio_player.dart lib/features/listening/listening_runner_screen.dart
git commit -m "feat(mobile): stream real section audio in the listening runner"
```

---

## Task 8: Docs + graphify refresh

**Files:**
- Modify: `docs/ROADMAP.md`
- Regenerate: graphify graphs for all four codebases (standing rule).

- [ ] **Step 1: Update the roadmap**

In `docs/ROADMAP.md`, note that real Listening audio (upload + web + mobile playback) is done; Speaking prompt audio remains held. Update the "Done (recent)" list accordingly.

- [ ] **Step 2: Refresh graphify graphs**

Refresh graphify for mobile, web, admin, and backend (web + backend graphs are on-disk/gitignored; mobile's is committed).

- [ ] **Step 3: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: mark Listening audio pipeline done; Speaking prompts still held"
```

---

## Self-Review

**Spec coverage:**
- Storage dir external + `/media/**` serving → Task 1 (dir) + Task 2 (handler). ✓
- Upload endpoint, auth gate, type/size validation → Task 1 (validation) + Task 2 (endpoint/auth). ✓
- Multipart limits → Task 1 Step 2. ✓
- `audioUrl` on section JSON, no backend model change → Tasks 3/6 (clients); backend passes content through (verified). ✓
- Studio upload UI + client-side duration auto-fill → Task 4. ✓
- Web runner real playback + fallback → Task 5. ✓
- Mobile just_audio + model/convert + mediaBase + runner → Tasks 6/7. ✓
- URL resolution (origin = base minus `/api`) → `resolveMedia` (Task 3) / `mediaBase` (Task 6). ✓
- Error handling: bad type/oversize 400, playback failure fallback, backward compat → Tasks 1/2/5/7. ✓
- Testing under the no-bind constraint (MockMvc, flutter test, browser) → Tasks 2/6/7/4/5. ✓
- Out of scope (speaking, roles, server-side duration) → untouched. ✓

**Placeholder scan:** No TBD/TODO; every code step carries concrete code. ✓

**Type consistency:** `resolveMedia`/`MEDIA_ORIGIN`/`api.media.upload` (Task 3) are consumed with the same signatures in Tasks 4/5. `ListeningSectionRun.audioUrl?` (Task 3) consumed in Task 5. `StudioSection.audioUrl/audioName/audioDurationSec` (Task 3) consumed in Task 4. `ListeningRunSection.audioUrl` + `AppConfig.mediaBase` (Task 6) consumed in Task 7. `SectionAudioPlayer` prop names match between definition (Task 7 Step 1) and use (Task 7 Step 2). `MediaStorageService.store/location` (Task 1) consumed in Task 2. ✓
