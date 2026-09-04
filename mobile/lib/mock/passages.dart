import '../models/models.dart';

const _tfng = [
  QuestionOption('True', 'True'),
  QuestionOption('False', 'False'),
  QuestionOption('Not Given', 'Not Given'),
];
const _ynng = [
  QuestionOption('Yes', 'Yes'),
  QuestionOption('No', 'No'),
  QuestionOption('Not Given', 'Not Given'),
];

const _endingsBox = [
  QuestionOption('A', 'by facilitating the movement of goods and people.'),
  QuestionOption('B', 'which marked the beginning of widespread electrification.'),
  QuestionOption('C', 'enabling rapid dissemination of knowledge.'),
  QuestionOption('D', 'by transforming communication over long distances.'),
  QuestionOption('E', 'making international travel and commerce more accessible.'),
  QuestionOption('F', 'by creating a digital economy and changing interactions.'),
  QuestionOption('G', 'despite having significant military applications.'),
  QuestionOption('H', 'although it initially faced numerous technical challenges.'),
  QuestionOption('I', 'leading to the rise of global trade networks.'),
];

const _headingsBox = [
  QuestionOption('i', 'The wheel and early mobility'),
  QuestionOption('ii', 'A revolution in shared knowledge'),
  QuestionOption('iii', 'Powering the modern age'),
  QuestionOption('iv', 'Shrinking the world'),
  QuestionOption('v', 'The unintended social costs'),
  QuestionOption('vi', 'From analogue to digital'),
];

const _featuresBox = [
  QuestionOption('A', 'Kahneman'),
  QuestionOption('B', 'Damasio'),
  QuestionOption('C', 'Tversky'),
];

const _paraBox = [
  QuestionOption('A', 'Paragraph A'),
  QuestionOption('B', 'Paragraph B'),
  QuestionOption('C', 'Paragraph C'),
  QuestionOption('D', 'Paragraph D'),
];

final ReadingExam readingExam = ReadingExam(
  id: 'read-languages',
  title:
      'The Evolution of Human Languages, Decision-Making Neuroscience & Ancient Trade Routes',
  durationSec: 20 * 60,
  questionTypes: QuestionType.values,
  passages: [
    Passage(
      id: 'p1',
      headline: 'The Dynamic Evolution of Human Languages',
      label: 'Academic',
      passageNumber: 1,
      totalPassages: 3,
      paragraphs: const [
        'Languages have been evolving ever since humans began to communicate, adapting to new circumstances and environments. This dynamic process of change is influenced by various factors, including social interactions, technological advancements, and cultural shifts. Understanding how languages evolve over time provides crucial insights into the history and development of human societies.',
        'One of the primary drivers of language evolution is the need for effective communication. As communities grow and interact with one another, their languages often adapt to incorporate new concepts and ideas. Linguistic borrowing, the process by which one language takes words from another, is a common phenomenon. English has borrowed extensively from Latin, French, and Germanic languages over the centuries. These borrowed words often fill lexical gaps in the language, allowing speakers to express new ideas and innovations.',
        'Another significant factor in language evolution is social change. As societies transform, their languages often reflect these shifts. For example, the rise of gender-neutral language in recent decades has been a response to changing social attitudes towards gender equality. This has led to the adoption of terms like "they" as a singular pronoun in English, which accommodates non-binary identities and challenges traditional grammatical norms.',
        'Technological advancements also play a crucial role in the evolution of languages. The advent of the internet and digital communication has introduced new vocabulary and changed the way people use language. The rapid exchange of information across global networks has led to the emergence of internet slang and abbreviations, such as "LOL" and "BRB." These innovations reflect the fast-paced nature of digital communication and the need for brevity in online interactions.',
        'Cultural exchange is another factor that influences language evolution. When people from different linguistic backgrounds come into contact, their languages often influence each other. This can result in the formation of pidgins and creoles — simplified languages that develop as a means of communication between speakers of different native languages, later maturing into fully developed tongues with their own grammar and vocabulary.',
      ],
      groups: [
        const QuestionGroup(
          id: 'p1g1',
          type: QuestionType.trueFalseNotGiven,
          rangeLabel: 'Questions 1–6',
          instructions:
              'Do the following statements agree with the information given in the passage? Choose TRUE, FALSE, or NOT GIVEN.',
          sharedOptions: _tfng,
          questions: [
            Question(id: 'q1', number: 1, prompt: 'Languages have been evolving only due to technological advancements.', correct: 'False'),
            Question(id: 'q2', number: 2, prompt: 'English has borrowed vocabulary from multiple languages over time.', correct: 'True'),
            Question(id: 'q3', number: 3, prompt: 'The rise of gender-neutral language is unrelated to social change.', correct: 'False'),
            Question(id: 'q4', number: 4, prompt: 'Internet slang has had no impact on language evolution.', correct: 'False'),
            Question(id: 'q5', number: 5, prompt: 'Cultural exchange does not contribute to the evolution of languages.', correct: 'False'),
            Question(id: 'q6', number: 6, prompt: 'Pidgins can develop into fully formed languages over time.', correct: 'True'),
          ],
        ),
        const QuestionGroup(
          id: 'p1g2',
          type: QuestionType.multipleChoice,
          rangeLabel: 'Questions 7–9',
          instructions: 'Choose the correct letter, A, B, C or D.',
          questions: [
            Question(id: 'q7', number: 7, prompt: 'According to the passage, linguistic borrowing mainly serves to', correct: 'B', options: [
              QuestionOption('A', 'replace older words that have fallen out of use'),
              QuestionOption('B', 'fill lexical gaps and express new ideas'),
              QuestionOption('C', 'make a language harder for outsiders to learn'),
              QuestionOption('D', 'preserve the grammar of ancient languages'),
            ]),
            Question(id: 'q8', number: 8, prompt: 'The singular pronoun "they" is given as an example of', correct: 'C', options: [
              QuestionOption('A', 'a borrowing from another language'),
              QuestionOption('B', 'an internet abbreviation'),
              QuestionOption('C', 'language responding to social change'),
              QuestionOption('D', 'a regional dialect'),
            ]),
            Question(id: 'q9', number: 9, prompt: 'Internet abbreviations such as "LOL" are described as reflecting', correct: 'A', options: [
              QuestionOption('A', 'the fast-paced nature of digital communication'),
              QuestionOption('B', 'a decline in literacy standards'),
              QuestionOption('C', 'the influence of Latin and French'),
              QuestionOption('D', 'formal academic writing'),
            ]),
          ],
        ),
        const QuestionGroup(
          id: 'p1g3',
          type: QuestionType.summaryCompletion,
          rangeLabel: 'Questions 10–13',
          instructions: 'Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
          questions: [
            Question(id: 'q10', number: 10, prompt: 'Languages adapt as communities grow and __________ with one another.', correct: 'interact', wordLimit: 'NO MORE THAN TWO WORDS'),
            Question(id: 'q11', number: 11, prompt: 'Borrowed words often fill lexical __________ in a language.', correct: 'gaps', wordLimit: 'NO MORE THAN TWO WORDS'),
            Question(id: 'q12', number: 12, prompt: 'Digital communication values __________ in online interactions.', correct: 'brevity', wordLimit: 'NO MORE THAN TWO WORDS'),
            Question(id: 'q13', number: 13, prompt: 'Contact languages may begin as pidgins and mature into __________.', correct: 'creoles', wordLimit: 'NO MORE THAN TWO WORDS'),
          ],
        ),
      ],
    ),
    Passage(
      id: 'p2',
      headline: 'Pivotal Inventions That Transformed Human History',
      label: 'Academic',
      passageNumber: 2,
      totalPassages: 3,
      paragraphs: const [
        'Throughout history, numerous inventions have significantly altered the course of human civilization. These innovations have not only improved the quality of life but have also opened new avenues for further technological advancements. Amongst these, there are a few notable inventions that stand out due to their profound impact on society and the world at large.',
        'The wheel, often cited as one of the most groundbreaking inventions in human history, revolutionized transportation and machinery. It is believed to have been invented around 3500 BC in Mesopotamia. The wheel enabled the development of carts and chariots, which facilitated the movement of goods and people over long distances.',
        'Another transformative invention was the printing press, developed by Johannes Gutenberg in the mid-15th century. The printing press made it possible to produce books and written material in large quantities, which dramatically lowered the cost of books and made them accessible to a wider audience, enabling rapid dissemination of knowledge.',
        'The steam engine, refined by James Watt in the late 18th century, powered factories, ships and locomotives, and became a driving force of the Industrial Revolution. Later, the harnessing of electricity marked the beginning of widespread electrification, transforming homes and industry alike.',
        'In the modern era, the internet has created a digital economy and changed the way people interact, work and learn, leading to the rise of global trade networks that would have been unimaginable to earlier generations.',
      ],
      groups: [
        const QuestionGroup(
          id: 'p2g1',
          type: QuestionType.matchingSentenceEndings,
          rangeLabel: 'Questions 14–19',
          instructions: 'Complete each sentence with the correct ending, A–I, from the box.',
          sharedOptions: _endingsBox,
          questions: [
            Question(id: 'q14', number: 14, prompt: 'The wheel revolutionized transportation', correct: 'A'),
            Question(id: 'q15', number: 15, prompt: 'The printing press lowered the cost of books,', correct: 'C'),
            Question(id: 'q16', number: 16, prompt: 'The steam engine powered the Industrial Revolution', correct: 'H'),
            Question(id: 'q17', number: 17, prompt: 'The harnessing of electricity was significant', correct: 'B'),
            Question(id: 'q18', number: 18, prompt: 'The telegraph and telephone reshaped society', correct: 'D'),
            Question(id: 'q19', number: 19, prompt: 'The internet reshaped the global economy', correct: 'F'),
          ],
        ),
        const QuestionGroup(
          id: 'p2g2',
          type: QuestionType.matchingHeadings,
          rangeLabel: 'Questions 20–23',
          instructions: 'Choose the correct heading for each paragraph from the list of headings.',
          sharedOptions: _headingsBox,
          questions: [
            Question(id: 'q20', number: 20, prompt: 'Paragraph B', correct: 'i'),
            Question(id: 'q21', number: 21, prompt: 'Paragraph C', correct: 'ii'),
            Question(id: 'q22', number: 22, prompt: 'Paragraph D', correct: 'iii'),
            Question(id: 'q23', number: 23, prompt: 'Paragraph E', correct: 'vi'),
          ],
        ),
        const QuestionGroup(
          id: 'p2g3',
          type: QuestionType.sentenceCompletion,
          rangeLabel: 'Questions 24–26',
          instructions: 'Complete the sentences below. Choose NO MORE THAN ONE WORD from the passage.',
          questions: [
            Question(id: 'q24', number: 24, prompt: 'The wheel is believed to have originated in __________.', correct: 'Mesopotamia', wordLimit: 'ONE WORD'),
            Question(id: 'q25', number: 25, prompt: 'The printing press was developed by Johannes __________.', correct: 'Gutenberg', wordLimit: 'ONE WORD'),
            Question(id: 'q26', number: 26, prompt: 'The steam engine was refined by James __________.', correct: 'Watt', wordLimit: 'ONE WORD'),
          ],
        ),
      ],
    ),
    Passage(
      id: 'p3',
      headline: 'The Neuroscience of Decision-Making',
      label: 'Academic',
      passageNumber: 3,
      totalPassages: 3,
      paragraphs: const [
        'For much of the twentieth century, economists assumed that people make decisions rationally, weighing costs and benefits to maximise their self-interest. Research in cognitive psychology and neuroscience has since revealed a far messier picture, in which emotion, intuition and mental shortcuts play a central role.',
        'The psychologist Daniel Kahneman, working with Amos Tversky, described two modes of thought: a fast, automatic system and a slow, deliberate system. The fast system relies on heuristics — rules of thumb that are usually helpful but can lead to systematic errors known as cognitive biases.',
        'The neuroscientist Antonio Damasio proposed that emotion is not the enemy of good decisions but a prerequisite for them. Patients with damage to emotion-processing regions of the brain struggled to make even trivial choices, despite intact reasoning ability.',
        'Modern brain-imaging studies suggest that the prefrontal cortex integrates signals from many regions when a person evaluates options, while the striatum encodes the anticipated reward. Understanding these mechanisms has implications for economics, medicine, public policy and the design of everyday products.',
      ],
      groups: [
        const QuestionGroup(
          id: 'p3g1',
          type: QuestionType.yesNoNotGiven,
          rangeLabel: 'Questions 27–31',
          instructions: 'Do the following statements agree with the claims of the writer? Choose YES, NO, or NOT GIVEN.',
          sharedOptions: _ynng,
          questions: [
            Question(id: 'q27', number: 27, prompt: 'Twentieth-century economists generally assumed people act rationally.', correct: 'Yes'),
            Question(id: 'q28', number: 28, prompt: 'Heuristics always lead to poor decisions.', correct: 'No'),
            Question(id: 'q29', number: 29, prompt: 'Emotion is necessary for effective decision-making.', correct: 'Yes'),
            Question(id: 'q30', number: 30, prompt: 'Kahneman and Tversky won a Nobel Prize for their work.', correct: 'Not Given'),
            Question(id: 'q31', number: 31, prompt: 'The striatum encodes anticipated reward.', correct: 'Yes'),
          ],
        ),
        const QuestionGroup(
          id: 'p3g2',
          type: QuestionType.matchingFeatures,
          rangeLabel: 'Questions 32–35',
          instructions: 'Match each statement with the correct researcher, A–C. You may use any letter more than once.',
          sharedOptions: _featuresBox,
          questions: [
            Question(id: 'q32', number: 32, prompt: 'Described two systems of thinking.', correct: 'A'),
            Question(id: 'q33', number: 33, prompt: 'Showed emotion is required for decisions.', correct: 'B'),
            Question(id: 'q34', number: 34, prompt: 'Collaborated on research into heuristics.', correct: 'C'),
            Question(id: 'q35', number: 35, prompt: 'Studied patients with brain damage.', correct: 'B'),
          ],
        ),
        const QuestionGroup(
          id: 'p3g3',
          type: QuestionType.matchingInformation,
          rangeLabel: 'Questions 36–38',
          instructions: 'Which paragraph contains the following information? Write the correct letter A–D.',
          sharedOptions: _paraBox,
          questions: [
            Question(id: 'q36', number: 36, prompt: 'A reference to how the brain values rewards.', correct: 'D'),
            Question(id: 'q37', number: 37, prompt: 'A definition of cognitive biases.', correct: 'B'),
            Question(id: 'q38', number: 38, prompt: 'An older assumption about human rationality.', correct: 'A'),
          ],
        ),
        const QuestionGroup(
          id: 'p3g4',
          type: QuestionType.shortAnswer,
          rangeLabel: 'Questions 39–40',
          instructions: 'Answer the questions below. Choose NO MORE THAN TWO WORDS from the passage.',
          questions: [
            Question(id: 'q39', number: 39, prompt: 'What kind of shortcuts does the fast system rely on?', correct: 'heuristics', wordLimit: 'NO MORE THAN TWO WORDS'),
            Question(id: 'q40', number: 40, prompt: 'Which brain region integrates signals when evaluating options?', correct: 'prefrontal cortex', wordLimit: 'NO MORE THAN TWO WORDS'),
          ],
        ),
        const QuestionGroup(
          id: 'p3g5',
          type: QuestionType.diagramLabel,
          rangeLabel: 'Questions 41–43',
          instructions: 'Label the diagram below. Choose NO MORE THAN TWO WORDS for each answer.',
          questions: [
            Question(id: 'q41', number: 41, prompt: 'Region that integrates signals', correct: 'prefrontal cortex', wordLimit: 'TWO WORDS'),
            Question(id: 'q42', number: 42, prompt: 'Region that encodes reward', correct: 'striatum', wordLimit: 'ONE WORD'),
            Question(id: 'q43', number: 43, prompt: 'Fast system relies on', correct: 'heuristics', wordLimit: 'ONE WORD'),
          ],
        ),
      ],
    ),
  ],
);
