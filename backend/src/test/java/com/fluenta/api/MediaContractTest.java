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
                        .content("{\"email\":\"sara.hamzeh@example.com\",\"password\":\"yalla-demo\"}"))
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
