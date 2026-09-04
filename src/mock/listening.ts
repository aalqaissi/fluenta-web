import type { ListeningExam, QuestionOption } from "./types";

const TFNG: QuestionOption[] = [
  { key: "True", text: "True" },
  { key: "False", text: "False" },
  { key: "Not Given", text: "Not Given" },
];

const SPEAKERS: QuestionOption[] = [
  { key: "A", text: "Dr. Reyes (the tutor)" },
  { key: "B", text: "Maya (student)" },
  { key: "C", text: "Tom (student)" },
];

/**
 * Built-in 4-section listening mock consumed by the student runner when no
 * authored exam is supplied. Audio is simulated (see AudioPlayer) — durations
 * are the length of the "recording" the play-once player counts through.
 */
export const listeningExam: ListeningExam = {
  id: "listen-community",
  title: "Everyday Life & Campus Study",
  scope: "global",
  durationSec: 30 * 60,
  attempts: 0,
  sections: [
    {
      id: "ls1",
      number: 1,
      context: "A conversation about booking a community hall.",
      difficulty: "Easy",
      audioDurationSec: 60,
      group: {
        id: "ls1-g",
        type: "sentence-completion",
        rangeLabel: "Questions 1–5",
        instructions: "Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.",
        questions: [
          { id: "ls1q1", number: 1, prompt: "The community hall can be booked for up to __________ hours.", correct: "four", wordLimit: "ONE WORD/NUMBER" },
          { id: "ls1q2", number: 2, prompt: "The deposit is refunded within __________ working days.", correct: "five", wordLimit: "ONE WORD/NUMBER" },
          { id: "ls1q3", number: 3, prompt: "Tables and __________ are provided free of charge.", correct: "chairs", wordLimit: "ONE WORD" },
          { id: "ls1q4", number: 4, prompt: "The car park is located behind the __________.", correct: "library", wordLimit: "ONE WORD" },
          { id: "ls1q5", number: 5, prompt: "Bookings must be confirmed by __________.", correct: "email", wordLimit: "ONE WORD" },
        ],
      },
    },
    {
      id: "ls2",
      number: 2,
      context: "A monologue giving information about a museum tour.",
      difficulty: "Easy",
      audioDurationSec: 55,
      group: {
        id: "ls2-g",
        type: "true-false-notgiven",
        rangeLabel: "Questions 6–9",
        instructions: "Do the following statements agree with the information in the talk? Choose True, False, or Not Given.",
        sharedOptions: TFNG,
        questions: [
          { id: "ls2q6", number: 6, prompt: "The museum tour lasts ninety minutes.", correct: "True" },
          { id: "ls2q7", number: 7, prompt: "Photography is allowed in every gallery.", correct: "False" },
          { id: "ls2q8", number: 8, prompt: "The café is on the ground floor.", correct: "True" },
          { id: "ls2q9", number: 9, prompt: "Guided tours run on public holidays.", correct: "Not Given" },
        ],
      },
    },
    {
      id: "ls3",
      number: 3,
      context: "A discussion between two students and a tutor.",
      difficulty: "Medium",
      audioDurationSec: 75,
      group: {
        id: "ls3-g",
        type: "matching-features",
        rangeLabel: "Questions 10–13",
        instructions: "Who makes each point about the group project? Choose A, B, or C for each statement.",
        sharedOptions: SPEAKERS,
        questions: [
          { id: "ls3q10", number: 10, prompt: "The deadline should be moved earlier.", correct: "A" },
          { id: "ls3q11", number: 11, prompt: "The survey needs more responses.", correct: "B" },
          { id: "ls3q12", number: 12, prompt: "The presentation slides are too detailed.", correct: "C" },
          { id: "ls3q13", number: 13, prompt: "The references are incomplete.", correct: "A" },
        ],
      },
    },
    {
      id: "ls4",
      number: 4,
      context: "A university lecture on marine biology.",
      difficulty: "Medium",
      audioDurationSec: 90,
      group: {
        id: "ls4-g",
        type: "summary-completion",
        rangeLabel: "Questions 14–18",
        instructions: "Complete the summary. Write ONE WORD ONLY for each answer.",
        questions: [
          { id: "ls4q14", number: 14, prompt: "Coral reefs support roughly a quarter of all marine __________.", correct: "species", wordLimit: "ONE WORD" },
          { id: "ls4q15", number: 15, prompt: "Rising ocean __________ is the main driver of coral bleaching.", correct: "temperature", wordLimit: "ONE WORD" },
          { id: "ls4q16", number: 16, prompt: "Bleached coral loses the __________ that give it colour.", correct: "algae", wordLimit: "ONE WORD" },
          { id: "ls4q17", number: 17, prompt: "Reefs protect coastlines by reducing wave __________.", correct: "energy", wordLimit: "ONE WORD" },
          { id: "ls4q18", number: 18, prompt: "Recovery is possible if stress is __________.", correct: "reduced", wordLimit: "ONE WORD" },
        ],
      },
    },
  ],
};
