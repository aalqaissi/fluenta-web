// Domain models for the Fluenta mobile prototype (mirror the web TS types).

enum SkillKey { reading, writing, listening, speaking }

extension SkillLabel on SkillKey {
  String get label => switch (this) {
        SkillKey.reading => 'Reading',
        SkillKey.writing => 'Writing',
        SkillKey.listening => 'Listening',
        SkillKey.speaking => 'Speaking',
      };
}

enum PlanTier { free, pro }

enum ExamStatus { notStarted, inProgress, completed }

enum QuestionType {
  trueFalseNotGiven,
  yesNoNotGiven,
  multipleChoice,
  matchingInformation,
  matchingHeadings,
  matchingFeatures,
  matchingSentenceEndings,
  sentenceCompletion,
  summaryCompletion,
  diagramLabel,
  shortAnswer,
}

extension QuestionTypeLabel on QuestionType {
  String get label => switch (this) {
        QuestionType.trueFalseNotGiven => 'True / False / Not Given',
        QuestionType.yesNoNotGiven => 'Yes / No / Not Given',
        QuestionType.multipleChoice => 'Multiple Choice',
        QuestionType.matchingInformation => 'Matching Information',
        QuestionType.matchingHeadings => 'Matching Headings',
        QuestionType.matchingFeatures => 'Matching Features',
        QuestionType.matchingSentenceEndings => 'Matching Sentence Endings',
        QuestionType.sentenceCompletion => 'Sentence Completion',
        QuestionType.summaryCompletion => 'Summary Completion',
        QuestionType.diagramLabel => 'Diagram Label Completion',
        QuestionType.shortAnswer => 'Short Answer',
      };
}

class Streak {
  final int current;
  final int best;
  final List<int> last30; // intensity 0..3
  const Streak({required this.current, required this.best, required this.last30});
}

class FluentaUser {
  final String name;
  final String email;
  final String initials;
  final PlanTier plan;
  final String planLabel;
  final int renewsInDays;
  final double targetBand;
  final DateTime? examDate;
  final bool saveHistory;
  final Streak streak;

  const FluentaUser({
    required this.name,
    required this.email,
    required this.initials,
    required this.plan,
    required this.planLabel,
    required this.renewsInDays,
    required this.targetBand,
    required this.examDate,
    required this.saveHistory,
    required this.streak,
  });

  FluentaUser copyWith({
    double? targetBand,
    DateTime? examDate,
    bool clearExamDate = false,
    bool? saveHistory,
  }) {
    return FluentaUser(
      name: name,
      email: email,
      initials: initials,
      plan: plan,
      planLabel: planLabel,
      renewsInDays: renewsInDays,
      targetBand: targetBand ?? this.targetBand,
      examDate: clearExamDate ? null : (examDate ?? this.examDate),
      saveHistory: saveHistory ?? this.saveHistory,
      streak: streak,
    );
  }
}

class SectionSummary {
  final SkillKey skill;
  final double? band;
  final int tests;
  const SectionSummary({required this.skill, required this.band, required this.tests});
}

class QuestionOption {
  final String key;
  final String text;
  const QuestionOption(this.key, this.text);
}

class Question {
  final String id;
  final int number;
  final String prompt;
  final String correct;
  final String? wordLimit;
  final List<QuestionOption>? options; // for multiple choice (per-question)
  const Question({
    required this.id,
    required this.number,
    required this.prompt,
    required this.correct,
    this.wordLimit,
    this.options,
  });
}

class QuestionGroup {
  final String id;
  final QuestionType type;
  final String rangeLabel;
  final String instructions;
  final List<QuestionOption>? sharedOptions;
  final List<Question> questions;
  const QuestionGroup({
    required this.id,
    required this.type,
    required this.rangeLabel,
    required this.instructions,
    this.sharedOptions,
    required this.questions,
  });
}

class Passage {
  final String id;
  final String headline;
  final String label;
  final int passageNumber;
  final int totalPassages;
  final List<String> paragraphs;
  final List<QuestionGroup> groups;
  const Passage({
    required this.id,
    required this.headline,
    required this.label,
    required this.passageNumber,
    required this.totalPassages,
    required this.paragraphs,
    required this.groups,
  });
}

class ReadingExam {
  final String id;
  final String title;
  final List<Passage> passages;
  final int durationSec;
  final List<QuestionType> questionTypes;
  const ReadingExam({
    required this.id,
    required this.title,
    required this.passages,
    required this.durationSec,
    required this.questionTypes,
  });
}

// ---- Writing ----
class WritingTask {
  final String id;
  final int taskNumber;
  final String kind;
  final String prompt;
  final int minWords;
  final int durationSec;
  const WritingTask({
    required this.id,
    required this.taskNumber,
    required this.kind,
    required this.prompt,
    required this.minWords,
    required this.durationSec,
  });
}

enum WritingCriterionKey { task, coherence, lexical, grammar }

class WritingCriterion {
  final WritingCriterionKey key;
  final String label;
  final double band;
  final String summary;
  const WritingCriterion(this.key, this.label, this.band, this.summary);
}

class WritingAnnotation {
  final WritingCriterionKey criterion;
  final String quote;
  final String note;
  const WritingAnnotation(this.criterion, this.quote, this.note);
}

class WritingResult {
  final double overall;
  final int wordCount;
  final String answer;
  final List<WritingCriterion> criteria;
  final List<WritingAnnotation> annotations;
  const WritingResult({
    required this.overall,
    required this.wordCount,
    required this.answer,
    required this.criteria,
    required this.annotations,
  });
}

// ---- Listening / Speaking ----
class ListeningSection {
  final int number;
  final String context;
  final int questionCount;
  const ListeningSection({required this.number, required this.context, required this.questionCount});
}

class SpeakingPart {
  final int number;
  final String title;
  final String? cueCard;
  final List<String>? bullets;
  final List<String> questions;
  const SpeakingPart({
    required this.number,
    required this.title,
    this.cueCard,
    this.bullets,
    required this.questions,
  });
}

class SpeakingFeedback {
  final String label;
  final double band;
  final String note;
  const SpeakingFeedback(this.label, this.band, this.note);
}

// ---- Plans / coach / lessons / achievements / certificates ----
class Plan {
  final String id;
  final String name;
  final String? badge;
  final String price;
  final String cadence;
  final String detail;
  final bool highlight;
  const Plan({
    required this.id,
    required this.name,
    this.badge,
    required this.price,
    required this.cadence,
    required this.detail,
    this.highlight = false,
  });
}

class CoachMessage {
  final String role; // 'user' | 'coach'
  final String text;
  const CoachMessage(this.role, this.text);
}

class Lesson {
  final String title;
  final String skill; // reading/writing/listening/speaking/general
  final String level;
  final int minutes;
  final String kind; // Video/Article/Drill
  final String summary;
  final int progress;
  const Lesson({
    required this.title,
    required this.skill,
    required this.level,
    required this.minutes,
    required this.kind,
    required this.summary,
    required this.progress,
  });
}

class Achievement {
  final String title;
  final String description;
  final bool earned;
  final int progress;
  final String? earnedOn;
  const Achievement({
    required this.title,
    required this.description,
    required this.earned,
    this.progress = 0,
    this.earnedOn,
  });
}

class Certificate {
  final String title;
  final double band;
  final String issuedOn;
  const Certificate({required this.title, required this.band, required this.issuedOn});
}

class RecentExam {
  final String id;
  final SkillKey skill;
  final String title;
  final ExamStatus status;
  final bool isMock;
  final String date;
  final int sectionsDone;
  final int sectionsTotal;
  final double? band;
  const RecentExam({
    required this.id,
    required this.skill,
    required this.title,
    required this.status,
    required this.isMock,
    required this.date,
    required this.sectionsDone,
    required this.sectionsTotal,
    this.band,
  });
}

class MockExamCard {
  final String id;
  final String title;
  final bool isGlobal;
  final int part;
  final QuestionType primaryType;
  final int attempts;
  final bool playable;
  const MockExamCard({
    required this.id,
    required this.title,
    required this.isGlobal,
    required this.part,
    required this.primaryType,
    required this.attempts,
    this.playable = false,
  });
}
