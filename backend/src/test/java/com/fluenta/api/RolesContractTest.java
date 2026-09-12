package com.fluenta.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class RolesContractTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private String adminToken() throws Exception {
        MvcResult r = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"sara.hamzeh@example.com\",\"password\":\"yalla-demo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("admin"))
                .andReturn();
        return om.readTree(r.getResponse().getContentAsString()).get("token").asText();
    }

    private String studentToken() throws Exception {
        String email = "stud-" + UUID.randomUUID() + "@example.com";
        MvcResult r = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"secret12\",\"name\":\"Stu\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("student"))
                .andReturn();
        return om.readTree(r.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void studentForbiddenFromAdminEndpoints() throws Exception {
        String t = studentToken();
        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + t)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/feedback").header("Authorization", "Bearer " + t)).andExpect(status().isForbidden());
    }

    @Test
    void studentForbiddenFromExamMutation() throws Exception {
        String t = studentToken();
        mvc.perform(post("/api/exams").header("Authorization", "Bearer " + t)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":null,\"skill\":\"reading\",\"title\":\"x\",\"module\":\"academic\",\"status\":\"draft\",\"scope\":\"user\",\"timeLimit\":30,\"updatedAt\":null,\"format\":\"studio\",\"content\":{}}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void studentCanStillReadExams() throws Exception {
        String t = studentToken();
        mvc.perform(get("/api/exams?status=published").header("Authorization", "Bearer " + t)).andExpect(status().isOk());
    }

    @Test
    void adminAllowedOnAdminEndpoints() throws Exception {
        String t = adminToken();
        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + t)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/feedback").header("Authorization", "Bearer " + t)).andExpect(status().isOk());
    }

    @Test
    void usersListExposesRole() throws Exception {
        String t = adminToken();
        mvc.perform(get("/api/admin/users?query=sara").header("Authorization", "Bearer " + t))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.id=='u1')].role").value(org.hamcrest.Matchers.contains("admin")));
    }
}
