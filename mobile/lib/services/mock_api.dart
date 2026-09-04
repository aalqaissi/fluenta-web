import '../mock/passages.dart';

/// A submitted reading attempt, carried from the runner to the results screen.
class ReadingAttempt {
  final Map<String, String> answers;
  final int correct;
  final int total;
  final double band;
  final int durationUsedSec;
  const ReadingAttempt({
    required this.answers,
    required this.correct,
    required this.total,
    required this.band,
    required this.durationUsedSec,
  });
}

class WritingAttempt {
  final String taskId;
  final String answer;
  final int wordCount;
  const WritingAttempt({required this.taskId, required this.answer, required this.wordCount});
}

class GradingStep {
  final String label;
  final int atProgress;
  const GradingStep(this.label, this.atProgress);
}

const List<GradingStep> gradingSteps = [
  GradingStep('Analyzing your response…', 10),
  GradingStep('Evaluating grammar and vocabulary…', 35),
  GradingStep('Calculating band score…', 60),
  GradingStep('Preparing detailed feedback…', 85),
  GradingStep('Grading complete!', 100),
];

/// Simple in-memory store carrying the last attempts between screens.
class AttemptStore {
  static ReadingAttempt? lastReading;
  static WritingAttempt? lastWriting;
}

double _rawToBand(int raw) {
  const table = <List<num>>[
    [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5],
    [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4],
  ];
  for (final row in table) {
    if (raw >= row[0]) return row[1].toDouble();
  }
  return 3.5;
}

ReadingAttempt scoreReading(Map<String, String> answers, int durationUsedSec) {
  int correct = 0, total = 0;
  for (final p in readingExam.passages) {
    for (final g in p.groups) {
      for (final q in g.questions) {
        total++;
        final given = (answers[q.id] ?? '').trim().toLowerCase();
        if (given.isNotEmpty && given == q.correct.trim().toLowerCase()) correct++;
      }
    }
  }
  return ReadingAttempt(
    answers: answers,
    correct: correct,
    total: total,
    band: _rawToBand(correct),
    durationUsedSec: durationUsedSec,
  );
}
