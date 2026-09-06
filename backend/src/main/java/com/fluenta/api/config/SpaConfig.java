package com.fluenta.api.config;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Serves the bundled single-page app (when the built frontend is packaged into
 * {@code classpath:/static/}) and falls back to {@code index.html} for client-side routes so deep
 * links / refreshes work. {@code /api/**} is never rewritten (it returns a normal 404 if unmatched),
 * so the REST controllers are unaffected. When no frontend is bundled (plain backend dev run), this
 * simply finds nothing to serve — the app is on the Vite dev server at :5173 instead.
 */
@Configuration
public class SpaConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requested = location.createRelative(resourcePath);
                        if (requested.exists() && requested.isReadable()) return requested;
                        // Let API calls 404 normally instead of returning the SPA shell.
                        if (resourcePath.startsWith("api/")) return null;
                        Resource index = new ClassPathResource("/static/index.html");
                        return index.exists() ? index : null;
                    }
                });
    }
}
