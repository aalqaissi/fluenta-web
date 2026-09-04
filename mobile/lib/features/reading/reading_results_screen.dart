import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/brand.dart';
import '../../mock/passages.dart';
import '../../services/mock_api.dart';
import '../../theme/app_colors.dart';
import '../../utils/format.dart';
import '../../widgets/ui.dart';
import '../exam/question_group_view.dart';

class ReadingResultsScreen extends StatelessWidget {
  const ReadingResultsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final attempt = AttemptStore.lastReading;
    final exam = readingExam;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back_rounded), onPressed: () => context.go('/progress')),
        title: const Text('Reading results'),
      ),
      body: attempt == null
          ? Padding(
              padding: const EdgeInsets.all(24),
              child: EmptyStateView(
                icon: Icons.emoji_events_outlined,
                title: 'No recent attempt',
                description: 'Finish a reading exam to see your AI-graded results here.',
                action: FilledButton(onPressed: () => context.go('/reading'), child: const Text('Start a reading exam')),
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                FluentaCard(
                  child: Column(children: [
                    Row(children: [
                      ProgressRing(
                        value: attempt.correct / attempt.total,
                        size: 96,
                        stroke: 10,
                        label: formatBand(attempt.band),
                        sublabel: 'band',
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const PillBadge('Graded by AI', color: AppColors.success, icon: Icons.auto_awesome),
                          const SizedBox(height: 6),
                          const Text('Nice work!', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                          Text('You answered ${attempt.correct}/${attempt.total} correctly in ${pad2(attempt.durationUsedSec ~/ 60)}:${pad2(attempt.durationUsedSec % 60)}.',
                              style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13)),
                        ]),
                      ),
                    ]),
                    const SizedBox(height: 14),
                    Row(children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => context.go('/exam/reading'),
                          icon: const Icon(Icons.refresh_rounded, size: 18),
                          label: const Text('Retake'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () => context.go('/coach'),
                          icon: const Icon(Icons.smart_toy_outlined, size: 18),
                          label: Text(Brand.coachName),
                        ),
                      ),
                    ]),
                  ]),
                ),
                const SizedBox(height: 20),
                const SectionHeader('Answer review'),
                ...exam.passages.map((p) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: FluentaCard(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            PillBadge('Passage ${p.passageNumber}', color: AppColors.mutedForeground),
                            const SizedBox(width: 8),
                            Flexible(child: Text(p.headline, style: const TextStyle(fontWeight: FontWeight.w800))),
                          ]),
                          const SizedBox(height: 12),
                          ...p.groups.map((g) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(g.rangeLabel, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
                                  const SizedBox(height: 8),
                                  QuestionGroupView(group: g, answers: attempt.answers, onChanged: (_, _) {}, review: true),
                                ]),
                              )),
                        ]),
                      ),
                    )),
              ],
            ),
    );
  }
}
