package com.fluenta.api.service.coach;

import org.springframework.stereotype.Component;

/** Offline/free coach: deterministic keyword replies (no model call). Ported from the web replyFor. */
@Component
public class StubCoachResponder {

    public String respond(String lastUserMessage) {
        String q = lastUserMessage == null ? "" : lastUserMessage.toLowerCase();
        if (q.contains("task achievement") || q.contains("band 5")) {
            return "Your Task 2 lost marks on Task Achievement because the body paragraphs were left empty — "
                    + "you signposted \"On the one hand / On the other hand\" but didn't develop either side. "
                    + "Try this: write one clear reason + one concrete example per paragraph. "
                    + "Want a 3-sentence template you can reuse?";
        }
        if (q.contains("true/false") || q.contains("not given") || q.contains("reading drill")) {
            return "Great — here's a 10-minute True/False/Not Given drill: 1) Read the statement first, "
                    + "2) find the matching lines, 3) ask \"does the text confirm, contradict, or stay silent?\". "
                    + "Silent = Not Given. I'll give you 5 statements now — ready?";
        }
        if (q.contains("coherence") || q.contains("cohesion")) {
            return "To lift coherence: use referencing (this, such, the latter) instead of repeating nouns, "
                    + "and make each paragraph start with a clear topic sentence. Shall we rewrite your intro together?";
        }
        if (q.contains("skim") || q.contains("scan")) {
            return "Skimming = reading fast for the general idea (read first/last sentences). "
                    + "Scanning = hunting for a specific detail (names, dates, numbers). "
                    + "In IELTS you skim once, then scan per question. Want to practice on a short passage?";
        }
        return "Good question! Based on your recent results, I'd prioritise Writing Task 2 structure and "
                + "Reading time-management. Want me to build you a short practice plan for this week?";
    }
}
