package com.fluenta.api;

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

    /** A fresh, collision-free email per call so tests stay repeatable against the persistent dev DB. */
    private String email(String prefix) {
        return prefix + "-" + java.util.UUID.randomUUID() + "@example.com";
    }

    private String reg(String email) {
        return "{\"email\":\"" + email + "\",\"password\":\"secret12\",\"name\":\"Test User\"}";
    }

    @Test
    void registerCreatesUnonboardedUnverifiedUser() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(reg(email("new1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.onboarded").value(false))
                .andExpect(jsonPath("$.user.name").value("Test User"));
    }

    @Test
    void duplicateEmailIsConflict() throws Exception {
        String dupEmail = email("dup");
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(reg(dupEmail)))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(reg(dupEmail)))
                .andExpect(status().isConflict());
    }

    @Test
    void shortPasswordIsBadRequest() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email("short") + "\",\"password\":\"abc\",\"name\":\"X\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loginSucceedsWithCorrectPassword() throws Exception {
        String loginEmail = email("login1");
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(reg(loginEmail)))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + loginEmail + "\",\"password\":\"secret12\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void loginFailsWithWrongPassword() throws Exception {
        String loginEmail = email("login2");
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(reg(loginEmail)))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + loginEmail + "\",\"password\":\"wrongpass\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginFailsForUnknownEmail() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email("nobody") + "\",\"password\":\"secret12\"}"))
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
