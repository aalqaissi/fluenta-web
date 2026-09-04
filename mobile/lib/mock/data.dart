import '../models/models.dart';

final FluentaUser currentUser = FluentaUser(
  name: 'Sara Hamzeh',
  email: 'sara.hamzeh@example.com',
  initials: 'SH',
  plan: PlanTier.pro,
  planLabel: 'Pro Monthly',
  renewsInDays: 7,
  targetBand: 7,
  examDate: DateTime(2026, 12, 1),
  saveHistory: true,
  streak: const Streak(
    current: 4,
    best: 11,
    last30: [0, 1, 0, 2, 1, 3, 2, 0, 0, 1, 2, 3, 3, 1, 0, 2, 1, 0, 3, 2, 1, 1, 0, 2, 3, 1, 2, 3, 2, 3],
  ),
);

const List<SectionSummary> sectionSummaries = [
  SectionSummary(skill: SkillKey.listening, band: null, tests: 0),
  SectionSummary(skill: SkillKey.reading, band: 6.5, tests: 3),
  SectionSummary(skill: SkillKey.writing, band: 5.5, tests: 1),
  SectionSummary(skill: SkillKey.speaking, band: null, tests: 0),
];

const List<MockExamCard> mockExams = [
  MockExamCard(id: 'm1', title: 'The Origins of Coffee Culture', isGlobal: true, part: 1, primaryType: QuestionType.trueFalseNotGiven, attempts: 0, playable: true),
  MockExamCard(id: 'm2', title: 'The History of Cartography', isGlobal: true, part: 1, primaryType: QuestionType.trueFalseNotGiven, attempts: 2, playable: true),
  MockExamCard(id: 'm3', title: 'Renewable Energy Transitions', isGlobal: true, part: 2, primaryType: QuestionType.matchingHeadings, attempts: 0),
  MockExamCard(id: 'm4', title: 'The Science of Sleep', isGlobal: true, part: 2, primaryType: QuestionType.summaryCompletion, attempts: 1),
  MockExamCard(id: 'm5', title: 'Ancient Trade Routes', isGlobal: true, part: 3, primaryType: QuestionType.matchingSentenceEndings, attempts: 0),
  MockExamCard(id: 'm6', title: 'Urban Beekeeping (my upload)', isGlobal: false, part: 1, primaryType: QuestionType.multipleChoice, attempts: 0),
];

const List<RecentExam> recentExams = [
  RecentExam(id: 'r1', skill: SkillKey.reading, title: 'Reading Exam', status: ExamStatus.inProgress, isMock: true, date: '2026-09-02', sectionsDone: 0, sectionsTotal: 1),
  RecentExam(id: 'r2', skill: SkillKey.reading, title: 'Reading Exam', status: ExamStatus.inProgress, isMock: true, date: '2026-09-02', sectionsDone: 0, sectionsTotal: 1),
  RecentExam(id: 'r3', skill: SkillKey.reading, title: 'Reading Exam', status: ExamStatus.completed, isMock: false, date: '2026-09-01', sectionsDone: 1, sectionsTotal: 1, band: 6.5),
  RecentExam(id: 'r4', skill: SkillKey.writing, title: 'Writing Task 2', status: ExamStatus.completed, isMock: false, date: '2026-08-30', sectionsDone: 1, sectionsTotal: 1, band: 5.5),
];

const List<Plan> plans = [
  Plan(id: 'starter', name: 'Starter Plan', price: 'Free', cadence: '', detail: 'Reading & Writing practice with limits.'),
  Plan(id: 'trial', name: '7-Day Trial', badge: 'NEW USERS', price: '\$4.99', cadence: 'today', detail: '\$4.99 today, then \$19.99/month after day 7.', highlight: true),
  Plan(id: 'monthly', name: 'Monthly', badge: 'STANDARD', price: '\$19.99', cadence: '/month', detail: '\$19.99 after a 3-day free trial, then \$19.99/month.'),
  Plan(id: 'sixmonth', name: '6-Month', badge: 'BEST VALUE', price: '\$49.99', cadence: '/6 months', detail: '\$49.99 after a 3-day free trial.'),
  Plan(id: 'yearly', name: 'Yearly', badge: 'SAVE 77%', price: '\$54.99', cadence: '/year', detail: 'Best price for committed learners.'),
];

const List<String> planIncludes = [
  'Full access to all features',
  'All 4 IELTS sections',
  'Unlimited AI grading & feedback',
  'Fluenta Coach conversations',
  'Mock exams & self-improvement tools',
];

const List<WritingTask> writingTasks = [
  WritingTask(
    id: 'w-task2',
    taskNumber: 2,
    kind: 'Opinion Essay',
    prompt:
        'More companies now place carbon-footprint labels on products so consumers can make environmentally informed choices. Do the advantages of carbon labelling outweigh the disadvantages?',
    minWords: 250,
    durationSec: 40 * 60,
  ),
  WritingTask(
    id: 'w-task1',
    taskNumber: 1,
    kind: 'Report',
    prompt:
        'The chart below shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features.',
    minWords: 150,
    durationSec: 20 * 60,
  ),
];

const WritingResult sampleWritingResult = WritingResult(
  overall: 5.0,
  wordCount: 64,
  answer:
      'Nowadays, companies around the world are switching to a more eco-friendly labelling system to be applied to their products. This essay will explore how the benefits of this phenomenon outweighs its drawbacks by explaing that looking after the environment is essential and has more benefits compared to the only cons that is high cost. On the one hand. On the other hand. In conclusion.',
  criteria: [
    WritingCriterion(WritingCriterionKey.task, 'Task Achievement', 5, 'The essay does not fully address both sides or reach a clear position within the word count.'),
    WritingCriterion(WritingCriterionKey.coherence, 'Coherence & Cohesion', 5, 'Paragraphing is signposted but bodies are empty; ideas are not developed.'),
    WritingCriterion(WritingCriterionKey.lexical, 'Lexical Resource', 5, 'Some good topic vocabulary, but repetition and a few word-choice slips.'),
    WritingCriterion(WritingCriterionKey.grammar, 'Grammatical Range & Accuracy', 4, 'Frequent errors in subject–verb agreement and spelling reduce clarity.'),
  ],
  annotations: [
    WritingAnnotation(WritingCriterionKey.task, 'This essay will explore how the benefits of this phenomenon outweighs its drawbacks', 'State your own position clearly and make sure both advantages and disadvantages are actually discussed in the body paragraphs.'),
    WritingAnnotation(WritingCriterionKey.grammar, 'the benefits of this phenomenon outweighs', 'Subject–verb agreement: "benefits … outweigh" (plural subject).'),
    WritingAnnotation(WritingCriterionKey.lexical, 'explaing', 'Spelling: "explaining". Proofread for common spelling slips.'),
    WritingAnnotation(WritingCriterionKey.coherence, 'On the one hand. On the other hand. In conclusion.', 'These are empty discourse markers — each needs a developed idea with an example.'),
  ],
);

const List<ListeningSection> listeningSections = [
  ListeningSection(number: 1, context: 'A conversation about booking a community hall.', questionCount: 10),
  ListeningSection(number: 2, context: 'A monologue giving information about a museum tour.', questionCount: 10),
  ListeningSection(number: 3, context: 'A discussion between two students and a tutor.', questionCount: 10),
  ListeningSection(number: 4, context: 'A university lecture on marine biology.', questionCount: 10),
];

final QuestionGroup listeningDemoGroup = const QuestionGroup(
  id: 'lg1',
  type: QuestionType.sentenceCompletion,
  rangeLabel: 'Questions 1–5',
  instructions: 'Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.',
  questions: [
    Question(id: 'lq1', number: 1, prompt: 'The community hall can be booked for up to __________ hours.', correct: 'four', wordLimit: 'ONE WORD/NUMBER'),
    Question(id: 'lq2', number: 2, prompt: 'The deposit is refunded within __________ working days.', correct: 'five', wordLimit: 'ONE WORD/NUMBER'),
    Question(id: 'lq3', number: 3, prompt: 'Tables and __________ are provided free of charge.', correct: 'chairs', wordLimit: 'ONE WORD'),
    Question(id: 'lq4', number: 4, prompt: 'The car park is located behind the __________.', correct: 'library', wordLimit: 'ONE WORD'),
    Question(id: 'lq5', number: 5, prompt: 'Bookings must be confirmed by __________.', correct: 'email', wordLimit: 'ONE WORD'),
  ],
);

const List<SpeakingPart> speakingParts = [
  SpeakingPart(number: 1, title: 'Introduction & interview', questions: [
    'Let\'s talk about your home town. Where is it and what is it like?',
    'Do you prefer to spend time indoors or outdoors? Why?',
    'How often do you read in English?',
  ]),
  SpeakingPart(number: 2, title: 'Individual long turn', cueCard: 'Describe a skill you would like to learn.', bullets: [
    'what the skill is',
    'why you want to learn it',
    'how you would learn it',
    'and explain how it would help you',
  ], questions: []),
  SpeakingPart(number: 3, title: 'Two-way discussion', questions: [
    'Do you think schools should teach more practical skills? Why?',
    'How has technology changed the way people learn new skills?',
    'Is it ever too late to learn something new?',
  ]),
];

const List<SpeakingFeedback> sampleSpeakingFeedback = [
  SpeakingFeedback('Fluency & Coherence', 6, 'Generally steady pace with occasional self-correction; use more linking phrases.'),
  SpeakingFeedback('Lexical Resource', 6, 'Good range on familiar topics; stretch toward less common collocations.'),
  SpeakingFeedback('Grammatical Range', 5, 'Simple structures are accurate; complex sentences need more control.'),
  SpeakingFeedback('Pronunciation', 6, 'Clear and mostly intelligible; watch word stress on longer words.'),
];

const List<String> coachSuggestions = [
  'Why did I get band 5 in Task Achievement?',
  'Give me a 10-minute Reading drill for True/False/Not Given.',
  'How do I improve my Writing coherence?',
  'Explain the difference between skimming and scanning.',
];

const List<CoachMessage> initialCoachMessages = [
  CoachMessage('coach',
      'Hi Sara! I\'m your Fluenta Coach. I\'ve looked at your latest Reading and Writing results — want to start with the Grammar feedback from your Task 2, or a quick Reading warm-up?'),
];

String coachReplyFor(String input) {
  final q = input.toLowerCase();
  if (q.contains('task achievement') || q.contains('band 5')) {
    return 'Your Task 2 lost marks on Task Achievement because the body paragraphs were left empty — you signposted "On the one hand / On the other hand" but didn\'t develop either side. Try this: write one clear reason + one concrete example per paragraph. Want a 3-sentence template you can reuse?';
  }
  if (q.contains('true') || q.contains('not given') || q.contains('reading drill')) {
    return 'Great — here\'s a 10-minute True/False/Not Given drill: 1) Read the statement first, 2) find the matching lines, 3) ask "does the text confirm, contradict, or stay silent?". Silent = Not Given. I\'ll give you 5 statements now — ready?';
  }
  if (q.contains('coherence') || q.contains('cohesion')) {
    return 'To lift coherence: use referencing (this, such, the latter) instead of repeating nouns, and make each paragraph start with a clear topic sentence. Shall we rewrite your intro together?';
  }
  if (q.contains('skim') || q.contains('scan')) {
    return 'Skimming = reading fast for the general idea. Scanning = hunting for a specific detail (names, dates, numbers). In IELTS you skim once, then scan per question. Want to practice on a short passage?';
  }
  return 'Good question! Based on your recent results, I\'d prioritise Writing Task 2 structure and Reading time-management. Want me to build you a short practice plan for this week?';
}

const List<Lesson> lessons = [
  Lesson(title: 'True/False/Not Given, decoded', skill: 'reading', level: 'Foundation', minutes: 8, kind: 'Video', summary: 'Stop losing marks on \'Not Given\' — a reliable 4-step method.', progress: 100),
  Lesson(title: 'Task 2: building a clear position', skill: 'writing', level: 'Intermediate', minutes: 12, kind: 'Article', summary: 'Turn a prompt into a thesis and a plan in under three minutes.', progress: 40),
  Lesson(title: 'Skimming vs scanning', skill: 'reading', level: 'Foundation', minutes: 6, kind: 'Video', summary: 'Read faster without losing comprehension.', progress: 0),
  Lesson(title: 'Linking words that actually help', skill: 'writing', level: 'Intermediate', minutes: 9, kind: 'Drill', summary: 'Cohesion beyond \'firstly, secondly, finally\'.', progress: 0),
  Lesson(title: 'Listening: predicting answers', skill: 'listening', level: 'Intermediate', minutes: 10, kind: 'Video', summary: 'Use the questions to anticipate what you\'ll hear.', progress: 0),
  Lesson(title: 'Speaking Part 2: the cue card', skill: 'speaking', level: 'Intermediate', minutes: 11, kind: 'Video', summary: 'Structure a 2-minute long turn with confidence.', progress: 20),
  Lesson(title: 'Paraphrasing under pressure', skill: 'general', level: 'Advanced', minutes: 14, kind: 'Article', summary: 'The core skill behind every band-7+ answer.', progress: 0),
  Lesson(title: 'Matching Headings without panic', skill: 'reading', level: 'Advanced', minutes: 9, kind: 'Drill', summary: 'A paragraph-mapping routine that saves time.', progress: 0),
];

const List<Achievement> achievements = [
  Achievement(title: 'First Steps', description: 'Complete your first practice section.', earned: true, earnedOn: '2026-08-28'),
  Achievement(title: 'Warm-Up Streak', description: 'Practice 3 days in a row.', earned: true, earnedOn: '2026-08-31'),
  Achievement(title: 'Reading Rookie', description: 'Finish 3 Reading exams.', earned: true, earnedOn: '2026-09-01'),
  Achievement(title: 'Feedback Fan', description: 'Read your AI feedback in full 5 times.', earned: false, progress: 60),
  Achievement(title: 'Band Climber', description: 'Improve any section by 0.5.', earned: false, progress: 30),
  Achievement(title: 'All-Rounder', description: 'Attempt all four skills.', earned: false, progress: 50),
  Achievement(title: 'Marathoner', description: 'Complete a full mock exam.', earned: false, progress: 0),
  Achievement(title: 'Coach\'s Favourite', description: 'Have 10 coaching conversations.', earned: false, progress: 10),
];

const List<Certificate> certificates = [
  Certificate(title: 'Reading Practice — Band 6.5', band: 6.5, issuedOn: '2026-09-01'),
  Certificate(title: 'Foundation Reading Course', band: 6.0, issuedOn: '2026-08-25'),
];
