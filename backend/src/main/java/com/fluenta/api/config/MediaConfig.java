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
