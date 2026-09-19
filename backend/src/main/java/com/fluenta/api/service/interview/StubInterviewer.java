package com.fluenta.api.service.interview;

import com.fluenta.api.dto.AiDtos.InterviewTurn;
import org.springframework.stereotype.Component;

import java.util.List;

/** Offline/free examiner: a fixed IELTS-shaped script that advances parts by candidate-turn count and ends
 *  after Part 3. Deterministic; no model/network. Standalone (NOT an Interviewer bean) so ClaudeInterviewer
 *  stays the only Interviewer bean and the LiveInterviewService test's @MockBean Interviewer is unambiguous. */
@Component
public class StubInterviewer {

    public record Line(String text, int part, boolean done) {}

    /** SCRIPT[i] is the examiner line to say once the candidate has given i answers. */
    private static final Line[] SCRIPT = {
            new Line("Good morning. I'm your examiner today. Could you tell me your full name, please?", 1, false),
            new Line("Thank you. Let's talk about where you live. What do you like about your hometown?", 1, false),
            new Line("Interesting. Now let's talk about your studies or work. What do you do?", 1, false),
            new Line("Now I'd like you to speak for up to two minutes. Describe a skill you would like to learn. "
                    + "You should say what it is, why you want to learn it, and how you would go about it.", 2, false),
            new Line("Thank you. Let's discuss learning more generally. Why do some skills take longer to master?", 3, false),
            new Line("And how has technology changed the way people learn new skills?", 3, false),
            new Line("Thank you. That's the end of the speaking interview. Well done.", 3, true),
    };

    public Line next(List<InterviewTurn> history, int currentPart) {
        int answers = 0;
        if (history != null) {
            for (InterviewTurn t : history) if (t != null && "candidate".equals(t.role())) answers++;
        }
        int i = Math.min(answers, SCRIPT.length - 1);
        return SCRIPT[i];
    }
}
