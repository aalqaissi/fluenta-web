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

/**
 * Exercises the real HTTP layer (routing, JSON (de)serialization, the bearer auth filter and status
 * codes) via MockMvc — in-process, no socket/selector — so the wire contract the frontend depends on
 * is verified even where the embedded server cannot bind. Run in-process: {@code mvn test -DforkCount=0}.
 */
@SpringBootTest
@AutoConfigureMockMvc
class HttpContractTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private String login() throws Exception {
        MvcResult res = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"sara.hamzeh@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value("u1"))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();
        return om.readTree(res.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void loginReturnsTokenAndUser() throws Exception {
        login();
    }

    @Test
    void meRequiresAuth() throws Exception {
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void meReturnsProfileWithToken() throws Exception {
        String token = login();
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Sara Hamzeh"))
                .andExpect(jsonPath("$.plan").value("pro"))
                .andExpect(jsonPath("$.streak.current").value(4));
    }

    @Test
    void listsPublishedExamsIncludingBuiltInReading() throws Exception {
        String token = login();
        mvc.perform(get("/api/exams?status=published").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id=='read-languages')]").exists())
                .andExpect(jsonPath("$[?(@.id=='read-languages')].format").value(contains("runner")));
    }

    @Test
    void getExamReturnsNestedContent() throws Exception {
        String token = login();
        mvc.perform(get("/api/exams/read-languages").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skill").value("reading"))
                .andExpect(jsonPath("$.content.passages").isArray());
    }

    @Test
    void submitAttemptScoresServerSide() throws Exception {
        String token = login();
        // Empty answers → 0 correct; the built-in reading exam has a fixed question count.
        MvcResult res = mvc.perform(post("/api/attempts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"examId\":\"read-languages\",\"skill\":\"reading\",\"answers\":{},\"durationUsedSec\":120}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(0))
                .andExpect(jsonPath("$.total").value(greaterThan(0)))
                .andReturn();
        JsonNode a = om.readTree(res.getResponse().getContentAsString());
        // fetch it back
        mvc.perform(get("/api/attempts/" + a.get("id").asText()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.examId").value("read-languages"));
    }

    @Test
    void studioCrudRoundTripsOverHttp() throws Exception {
        String token = login();
        String body = "{\"id\":null,\"skill\":\"reading\",\"title\":\"HTTP CRUD\",\"module\":\"academic\"," +
                "\"status\":\"draft\",\"scope\":\"user\",\"timeLimit\":30,\"updatedAt\":null,\"format\":\"studio\"," +
                "\"content\":{\"passages\":[{\"id\":\"hp1\",\"title\":\"P\",\"questionType\":\"short-answer\"," +
                "\"questions\":[{\"id\":\"hq1\",\"prompt\":\"?\",\"answer\":\"a\"}]}]}}";
        MvcResult res = mvc.perform(post("/api/exams").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn();
        String id = om.readTree(res.getResponse().getContentAsString()).get("id").asText();

        mvc.perform(post("/api/exams/" + id + "/status").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"published\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("published"));

        mvc.perform(delete("/api/exams/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mvc.perform(get("/api/exams/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void aiEndpointsAreDisabled() throws Exception {
        String token = login();
        mvc.perform(post("/api/ai/coach").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotImplemented())
                .andExpect(jsonPath("$.comingSoon").value(true));
    }

    @Test
    void referenceContentIsServed() throws Exception {
        String token = login();
        mvc.perform(get("/api/lessons").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isArray());
        mvc.perform(get("/api/plans").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.plans").isArray());
    }

    @Test
    void meCarriesOnboardingAndTrack() throws Exception {
        String token = login();
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.track").value("ielts"))
                .andExpect(jsonPath("$.onboarded").value(true));
    }

    @Test
    void overviewComputesAggregatesForSixSkills() throws Exception {
        String token = login();
        mvc.perform(get("/api/overview").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skills.length()").value(6))
                .andExpect(jsonPath("$.targetBand").value(greaterThan(0.0)))
                .andExpect(jsonPath("$.currentAverage").value(greaterThan(0.0)))
                .andExpect(jsonPath("$.strongest.key").isNotEmpty())
                .andExpect(jsonPath("$.weakest.key").isNotEmpty())
                .andExpect(jsonPath("$.series.overall").isArray())
                .andExpect(jsonPath("$.recentActivity").isArray());
    }

    @Test
    void tracksListHasActiveIelts() throws Exception {
        String token = login();
        mvc.perform(get("/api/tracks").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.key=='ielts')].status").value(contains("active")))
                .andExpect(jsonPath("$[?(@.key=='toefl')]").exists());
    }

    @Test
    void achievementsAreEnriched() throws Exception {
        String token = login();
        mvc.perform(get("/api/achievements").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tier").isNotEmpty())
                .andExpect(jsonPath("$[0].points").isNumber())
                .andExpect(jsonPath("$[0].category").isNotEmpty());
    }

    @Test
    void feedbackFlowStudentThenAdmin() throws Exception {
        String token = login();
        // student submits
        MvcResult res = mvc.perform(post("/api/feedback").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"category\":\"Suggestion\",\"subject\":\"More vocab\",\"message\":\"Please add vocab drills\",\"rating\":5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("new"))
                .andReturn();
        String id = om.readTree(res.getResponse().getContentAsString()).get("id").asText();

        // summary reflects it
        mvc.perform(get("/api/feedback/summary").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.latest.id").value(id));

        // admin queue lists it
        mvc.perform(get("/api/admin/feedback").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.id=='" + id + "')]").exists());

        // admin moves it to completed with a reply
        mvc.perform(patch("/api/admin/feedback/" + id).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"completed\",\"adminReply\":\"Added to the roadmap, thanks!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.adminReply").value("Added to the roadmap, thanks!"));
    }
}
