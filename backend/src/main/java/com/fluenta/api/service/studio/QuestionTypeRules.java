package com.fluenta.api.service.studio;

import java.util.Map;

/**
 * What each IELTS Reading/Listening question type tests and how it must be built, after the official
 * IELTS task-type descriptions (ielts.org) and the owner spec (TFNG vs YNNG). Fed to the AI item writer
 * per requested type, and mirrored for the Studio in {@code src/features/studio/questionTypeRules.ts}.
 *
 * @param aim         the skill the type assesses
 * @param rules       how items of this type are written
 * @param textOrder   questions follow the order of the information in the text
 * @param lettersOnce for lettered-list types: each letter may be the answer to at most one question
 */
public final class QuestionTypeRules {
    private QuestionTypeRules() {}

    public record Rule(String aim, String rules, boolean textOrder, boolean lettersOnce) {}

    private static final Map<String, Rule> RULES = Map.ofEntries(
            Map.entry("multiple-choice", new Rule(
                    "detailed understanding of specific points, or overall understanding of the main points",
                    "Four options A-D, exactly one correct; the three distractors are plausible but wrong according to the text.",
                    true, false)),
            Map.entry("multi-select", new Rule(
                    "detailed understanding of specific points, or overall understanding of the main points",
                    "Choose TWO from five options (A-E) or THREE from seven (A-G); exactly that many are correct according to the text.",
                    true, false)),
            Map.entry("true-false-notgiven", new Rule(
                    "recognising particular points of FACTUAL information conveyed in the text",
                    "TRUE agrees with the information, FALSE contradicts it, NOT GIVEN = the text neither confirms nor contradicts it.",
                    true, false)),
            Map.entry("yes-no-notgiven", new Rule(
                    "recognising the WRITER'S opinions, views or claims (used with discursive or argumentative texts)",
                    "YES agrees with the writer's view/claim, NO contradicts it, NOT GIVEN = the writer's position cannot be established.",
                    true, false)),
            Map.entry("matching-information", new Rule(
                    "scanning for specific information - a detail, example, reason, description, comparison, summary or explanation",
                    "Statements are matched to lettered paragraphs; not every paragraph need be used and a letter may be used more than once.",
                    false, false)),
            Map.entry("matching-headings", new Rule(
                    "recognising the main idea or theme of a paragraph and telling main ideas from supporting detail",
                    "The list of headings uses lower-case Roman numerals (i, ii, iii...) and has more headings than paragraphs; each question names one paragraph; each heading fits only one paragraph and is used at most once.",
                    false, true)),
            Map.entry("matching-features", new Rule(
                    "recognising relationships and connections between facts in the text, and opinions and theories",
                    "Statements are matched to a lettered list of features (people, places, dates, theories...); some options may be used more than once and some not at all.",
                    false, false)),
            Map.entry("matching-sentence-endings", new Rule(
                    "understanding the main ideas within a sentence",
                    "Each question is a sentence beginning that one ending completes correctly according to the text; there are more endings than questions and each ending is used at most once.",
                    true, true)),
            Map.entry("sentence-completion", new Rule(
                    "locating detail and specific information",
                    "Complete each sentence with words copied unchanged from the text, within the stated word limit.",
                    true, false)),
            Map.entry("summary-completion", new Rule(
                    "understanding details and/or the main ideas of one part of the text",
                    "A summary of one part of the text with gaps filled by words copied from the text, within the word limit.",
                    false, false)),
            Map.entry("note-completion", new Rule(
                    "understanding details and/or the main ideas of one part of the text",
                    "Notes on one part of the text with gaps filled by words copied from the text, within the word limit.",
                    false, false)),
            Map.entry("table-completion", new Rule(
                    "understanding details and/or the main ideas of one part of the text",
                    "A table summarising one part of the text, gaps filled by words copied from the text, within the word limit.",
                    false, false)),
            Map.entry("flow-chart-completion", new Rule(
                    "understanding a process or sequence described in one part of the text",
                    "Flow-chart stages filled by words copied from the text, within the word limit.",
                    false, false)),
            Map.entry("form-completion", new Rule(
                    "recording specific factual details (Listening)",
                    "Form fields filled by words or numbers heard, within the word limit.",
                    true, false)),
            Map.entry("diagram-label", new Rule(
                    "understanding a detailed description and relating it to information shown in a diagram",
                    "Labels filled by words copied from the text, within the word limit.",
                    false, false)),
            Map.entry("short-answer", new Rule(
                    "locating and understanding precise factual information",
                    "Answer each question with words or numbers copied from the text, within the word limit.",
                    true, false)));

    /** The rule for a type, or null if unknown. */
    public static Rule forType(String type) {
        return type == null ? null : RULES.get(type);
    }

    /** Each letter of the list answers at most one question (Matching Headings, Matching Sentence Endings). */
    public static boolean lettersOnce(String type) {
        Rule r = forType(type);
        return r != null && r.lettersOnce();
    }

    /** The type's rules as a prompt block, or "" for an unknown type. */
    public static String prompt(String type) {
        Rule r = forType(type);
        if (r == null) return "";
        return "TYPE RULES (" + type + ")\nAIM: this type tests " + r.aim() + ". Every question must test exactly that.\n"
                + "FORMAT: " + r.rules() + "\n"
                + (r.textOrder() ? "ORDER: questions follow the order in which the information appears in the text.\n"
                                 : "ORDER: questions need not follow the order of the text.\n");
    }
}
