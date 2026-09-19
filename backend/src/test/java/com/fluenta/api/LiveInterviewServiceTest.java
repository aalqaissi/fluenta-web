package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.*;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.LiveInterviewService;
import com.fluenta.api.service.MediaStorageService;
import com.fluenta.api.service.Transcriber;
import com.fluenta.api.service.interview.Interviewer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
        "fluenta.ai.enabled=true", "fluenta.ai.api-key=sk-test", "fluenta.ai.persist=false",
        "fluenta.ai.transcribe.enabled=true", "fluenta.ai.transcribe.api-key=sk-whisper"})
class LiveInterviewServiceTest {

    @MockBean Transcriber transcriber;      // replaces WhisperTranscriber
    @MockBean Interviewer interviewer;      // replaces ClaudeInterviewer
    @MockBean AiClient ai;                  // used by the grade path
    // @SpyBean (not @MockBean): MediaConfig calls media.location() while building the /media/**
    // resource handler at context-startup time, before any test method's when(...) stub runs. A
    // @MockBean returns null there and blows up context load with an NPE deep in Spring's
    // ResourceHttpRequestHandler (see SpeakingFeedbackServiceTest for the same fix).
    @SpyBean MediaStorageService media;
    @Autowired LiveInterviewService svc;

    @Test
    void openingTurnHasNoAudioAndGreetsInPartOne() {
        when(interviewer.next(anyString(), anyList(), anyInt()))
                .thenReturn(new Interviewer.Reply("Good morning. Your full name, please?", 1, false));
        var reply = svc.turn("u1", new LiveInterviewTurnRequest(1, List.of(), null));
        assertThat(reply.transcript()).isEmpty();          // no candidate audio yet
        assertThat(reply.reply()).contains("morning");
        assertThat(reply.part()).isEqualTo(1);
        assertThat(reply.done()).isFalse();
        verify(transcriber, never()).transcribe(any(), anyString());   // STT skipped on the opening turn
    }

    @Test
    void normalTurnTranscribesTheAnswerAndReturnsTheExaminerReply() {
        doReturn(new byte[]{1, 2, 3}).when(media).readAudio(anyString());
        when(transcriber.transcribe(any(), anyString())).thenReturn("My name is Sara.");
        when(interviewer.next(anyString(), anyList(), anyInt()))
                .thenReturn(new Interviewer.Reply("Nice to meet you. Where are you from?", 1, false));
        var req = new LiveInterviewTurnRequest(1,
                List.of(new InterviewTurn("examiner", "Your full name, please?")), "/media/a.webm");
        var reply = svc.turn("u1", req);
        assertThat(reply.transcript()).isEqualTo("My name is Sara.");
        assertThat(reply.reply()).contains("from");
        assertThat(reply.part()).isEqualTo(1);
    }

    @Test
    void partIsClampedMonotonicAndAdvancesAtMostOne() {
        doReturn(new byte[]{1}).when(media).readAudio(anyString());
        when(transcriber.transcribe(any(), anyString())).thenReturn("answer");
        // model tries to jump from part 1 to part 3 -> clamped to 2
        when(interviewer.next(anyString(), anyList(), anyInt()))
                .thenReturn(new Interviewer.Reply("Let's move on.", 3, false));
        var req = new LiveInterviewTurnRequest(1,
                List.of(new InterviewTurn("examiner", "Q")), "/media/a.webm");
        assertThat(svc.turn("u1", req).part()).isEqualTo(2);
    }

    @Test
    void doneIsRejectedBeforePartThree() {
        doReturn(new byte[]{1}).when(media).readAudio(anyString());
        when(transcriber.transcribe(any(), anyString())).thenReturn("answer");
        when(interviewer.next(anyString(), anyList(), anyInt()))
                .thenReturn(new Interviewer.Reply("Goodbye.", 1, true));   // premature done in part 1
        var req = new LiveInterviewTurnRequest(1,
                List.of(new InterviewTurn("examiner", "Q")), "/media/a.webm");
        assertThat(svc.turn("u1", req).done()).isFalse();
    }

    @Test
    void gradeReusesTheSpeakingGate() {
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"overall":6.5,"criteria":[
              {"key":"fluency","band":6.5,"note":"ok"},
              {"key":"lexical","band":6,"note":"ok"},
              {"key":"grammar","band":6,"note":"ok"},
              {"key":"pronunciation","band":6,"note":"estimated"}]}""");
        var req = new LiveInterviewGradeRequest("live-interview",
                List.of(new SpeakingPartResult(1, "coastal town", ""),
                        new SpeakingPartResult(3, "technology helps", "")));
        var r = svc.grade("u1", req);
        assertThat(r.criteria()).hasSize(4);
        assertThat(r.overall()).isEqualTo(6.5);
    }
}
