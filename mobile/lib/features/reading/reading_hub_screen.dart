import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../mock/passages.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui.dart';

class ReadingHubScreen extends StatelessWidget {
  const ReadingHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final exam = readingExam;
    final sets = [
      ('Science & Environment', 'Academic'),
      ('Society & Culture', 'Academic'),
      ('Technology & Innovation', 'Academic'),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Reading practice')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          FluentaCard(
            padding: EdgeInsets.zero,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const PillBadge('Featured set', color: AppColors.success, icon: Icons.menu_book_rounded),
                    const SizedBox(height: 8),
                    Text(exam.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, height: 1.25)),
                    const SizedBox(height: 6),
                    const Text('3 passages · 40 questions · covers True/False/Not Given, Matching, Completion and more.',
                        style: TextStyle(color: AppColors.mutedForeground, fontSize: 13)),
                    const SizedBox(height: 12),
                    Row(children: const [
                      _Meta(Icons.schedule_rounded, '60 min'),
                      SizedBox(width: 16),
                      _Meta(Icons.checklist_rounded, '40 questions'),
                      SizedBox(width: 16),
                      _Meta(Icons.school_rounded, 'Academic'),
                    ]),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: () => context.push('/exam/reading'),
                        icon: const Icon(Icons.play_arrow_rounded),
                        label: const Text('Start reading exam'),
                      ),
                    ),
                  ]),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const SectionHeader('More reading sets'),
          ...sets.map((s) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: FluentaCard(
                  onTap: () => context.push('/exam/reading'),
                  child: Row(children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.menu_book_rounded, color: AppColors.success),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(s.$1, style: const TextStyle(fontWeight: FontWeight.w800)),
                        const Text('3 passages · 40 questions', style: TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                      ]),
                    ),
                    const Icon(Icons.play_circle_outline_rounded, color: AppColors.primary),
                  ]),
                ),
              )),
        ],
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  final IconData icon;
  final String text;
  const _Meta(this.icon, this.text);
  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 15, color: AppColors.mutedForeground),
      const SizedBox(width: 4),
      Text(text, style: const TextStyle(fontSize: 12.5, color: AppColors.mutedForeground)),
    ]);
  }
}
