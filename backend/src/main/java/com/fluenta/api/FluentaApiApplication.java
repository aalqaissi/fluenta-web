package com.fluenta.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Fluenta IELTS prep — backend API entry point.
 *
 * <p>Serves the React/Vite frontend: auth, content authoring (Studio), exam listing,
 * server-side scoring of reading/listening attempts, results, progress, certificates and
 * seeded reference content. AI features (writing/speaking feedback, coach, live interview)
 * are intentionally stubbed at this stage — see {@code web.AiController}.
 */
@SpringBootApplication
public class FluentaApiApplication {
    public static void main(String[] args) {
        // The SQLite driver does not create the parent directory for the DB file, so ensure it
        // exists before the datasource connects (works on a fresh checkout too).
        new java.io.File("data").mkdirs();
        SpringApplication.run(FluentaApiApplication.class, args);
    }
}
