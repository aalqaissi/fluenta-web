package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.InterviewTurn;
import com.fluenta.api.service.interview.StubInterviewer;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StubInterviewerTest {
    private final StubInterviewer stub = new StubInterviewer();

    @Test
    void opensInPartOneWithNoAnswersYet() {
        var line = stub.next(List.of(), 1);
        assertThat(line.part()).isEqualTo(1);
        assertThat(line.done()).isFalse();
        assertThat(line.text()).isNotBlank();
    }

    @Test
    void advancesThroughPartsAndTerminatesDeterministically() {
        List<InterviewTurn> history = new ArrayList<>();
        int lastPart = 1;
        boolean done = false;
        // simulate a long interview: keep adding candidate turns until the stub says done
        for (int i = 0; i < 12 && !done; i++) {
            history.add(new InterviewTurn("candidate", "answer " + i));
            var line = stub.next(history, lastPart);
            assertThat(line.part()).isBetween(1, 3).isGreaterThanOrEqualTo(lastPart);  // monotonic, in range
            lastPart = line.part();
            done = line.done();
            if (!done) history.add(new InterviewTurn("examiner", line.text()));
        }
        assertThat(done).isTrue();      // the interview ends
        assertThat(lastPart).isEqualTo(3);
    }
}
