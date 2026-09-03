// Tiny in-memory store to carry a submitted attempt from runner -> results
// (frontend-only prototype; survives client-side navigation, resets on reload).
export interface Attempt {
  examId: string;
  answers: Record<string, string>;
  correct: number;
  total: number;
  band: number;
  durationUsedSec: number;
}

let last: Attempt | null = null;

export function setLastAttempt(a: Attempt) {
  last = a;
}
export function getLastAttempt() {
  return last;
}

export interface WritingAttempt {
  taskId: string;
  answer: string;
  wordCount: number;
}
let lastWriting: WritingAttempt | null = null;
export function setLastWriting(w: WritingAttempt) {
  lastWriting = w;
}
export function getLastWriting() {
  return lastWriting;
}
