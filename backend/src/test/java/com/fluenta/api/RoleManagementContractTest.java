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
class RoleManagementContractTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private String adminToken() throws Exception {
        MvcResult r = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"sara.hamzeh@example.com\",\"password\":\"yalla-demo\"}"))
                .andExpect(status().isOk()).andReturn();
        return om.readTree(r.getResponse().getContentAsString()).get("token").asText();
    }

    private String registerUserId(String token) throws Exception {
        String email = "role-" + UUID.randomUUID() + "@example.com";
        MvcResult r = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"secret12\",\"name\":\"R\"}"))
                .andExpect(status().isOk()).andReturn();
        return om.readTree(r.getResponse().getContentAsString()).get("user").get("id").asText();
    }

    @Test
    void adminCanPromoteAndDemoteAnotherUser() throws Exception {
        String t = adminToken();
        String id = registerUserId(t);
        mvc.perform(patch("/api/admin/users/" + id).header("Authorization", "Bearer " + t)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"admin\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("admin"));
        mvc.perform(patch("/api/admin/users/" + id).header("Authorization", "Bearer " + t)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"student\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("student"));
    }

    @Test
    void selfDemotionRejected() throws Exception {
        String t = adminToken();
        mvc.perform(patch("/api/admin/users/u1").header("Authorization", "Bearer " + t)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"student\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void invalidRoleRejected() throws Exception {
        String t = adminToken();
        String id = registerUserId(t);
        mvc.perform(patch("/api/admin/users/" + id).header("Authorization", "Bearer " + t)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"superuser\"}"))
                .andExpect(status().isBadRequest());
    }
}
