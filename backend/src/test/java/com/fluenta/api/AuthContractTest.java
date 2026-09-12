package com.fluenta.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthContractTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private String reg(String email) {
        return "{\"email\":\"" + email + "\",\"password\":\"secret12\",\"name\":\"Test User\"}";
    }

    @Test
    void registerCreatesUnonboardedUnverifiedUser() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(reg("new1@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.onboarded").value(false))
                .andExpect(jsonPath("$.user.name").value("Test User"));
    }

    @Test
    void duplicateEmailIsConflict() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(reg("dup@example.com")))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(reg("dup@example.com")))
                .andExpect(status().isConflict());
    }

    @Test
    void shortPasswordIsBadRequest() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"short@example.com\",\"password\":\"abc\",\"name\":\"X\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loginSucceedsWithCorrectPassword() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(reg("login1@example.com")))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"login1@example.com\",\"password\":\"secret12\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void loginFailsWithWrongPassword() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(reg("login2@example.com")))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"login2@example.com\",\"password\":\"wrongpass\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginFailsForUnknownEmail() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@example.com\",\"password\":\"secret12\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void seededDemoUserLogsInWithDemoPassword() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"sara.hamzeh@example.com\",\"password\":\"yalla-demo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value("u1"));
    }
}
