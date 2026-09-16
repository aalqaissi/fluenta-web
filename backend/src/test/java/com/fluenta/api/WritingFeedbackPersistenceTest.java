package com.fluenta.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "fluenta.ai.persist=true")
@AutoConfigureMockMvc
class WritingFeedbackPersistenceTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private String login() throws Exception {
        MvcResult res = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"sara.hamzeh@example.com\",\"password\":\"yalla-demo\"}"))
                .andExpect(status().isOk()).andReturn();
        return om.readTree(res.getResponse().getContentAsString()).get("token").asText();
    }

    private String body() {
        return "{\"taskNumber\":2,\"kind\":\"Opinion Essay\",\"module\":\"academic\",\"prompt\":\"P\"," +
                "\"minWords\":250,\"essay\":\"" + "word ".repeat(60).trim() + "\"}";
    }

    @Test
    void persistsAndFetchesById() throws Exception {
        String token = login();
        MvcResult res = mvc.perform(post("/api/ai/writing-feedback").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn();
        String id = om.readTree(res.getResponse().getContentAsString()).get("id").asText();

        mvc.perform(get("/api/ai/writing-feedback/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.criteria.length()").value(4));

        mvc.perform(get("/api/ai/writing-feedback/does-not-exist").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }
}
