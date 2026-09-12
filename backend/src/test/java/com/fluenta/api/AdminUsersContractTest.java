package com.fluenta.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AdminUsersContractTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    /** A fresh, collision-free email per call so tests stay repeatable against the persistent dev DB. */
    private String email(String prefix) {
        return prefix + "-" + java.util.UUID.randomUUID() + "@example.com";
    }

    private String token() throws Exception {
        MvcResult r = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"sara.hamzeh@example.com\",\"password\":\"yalla-demo\"}"))
                .andExpect(status().isOk()).andReturn();
        return om.readTree(r.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void listRequiresAuth() throws Exception {
        mvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
    }

    @Test
    void listReturnsPagedUsersIncludingSeed() throws Exception {
        String t = token();
        mvc.perform(get("/api/admin/users?size=10").header("Authorization", "Bearer " + t))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.items[?(@.id=='u1')].emailVerified").value(org.hamcrest.Matchers.contains(true)));
    }

    @Test
    void searchMatchesEmail() throws Exception {
        String t = token();
        mvc.perform(get("/api/admin/users?query=sara").header("Authorization", "Bearer " + t))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.id=='u1')]").exists());
    }

    @Test
    void patchTogglesVerified() throws Exception {
        String t = token();
        // register an unverified user, then verify them
        String toVerifyEmail = email("toverify");
        MvcResult r = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + toVerifyEmail + "\",\"password\":\"secret12\",\"name\":\"To Verify\"}"))
                .andExpect(status().isOk()).andReturn();
        String id = om.readTree(r.getResponse().getContentAsString()).get("user").get("id").asText();
        mvc.perform(patch("/api/admin/users/" + id).header("Authorization", "Bearer " + t)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"emailVerified\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailVerified").value(true));
    }
}
