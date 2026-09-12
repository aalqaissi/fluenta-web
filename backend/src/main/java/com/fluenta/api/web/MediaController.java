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
        CurrentUser.requireAdmin();
        return Map.of("url", storage.store(file));
    }
}
