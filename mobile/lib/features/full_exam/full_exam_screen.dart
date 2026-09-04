import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui.dart';

class FullExamScreen extends StatelessWidget {
  const FullExamScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final locked = context.watch<AppState>().isLocked('full-exam');
    final sections = [
      ('Listening', Icons.headphones_rounded, 30, '4 sections · 40 questions', '/listening', AppColors.secondary),
      ('Reading', Icons.menu_book_rounded, 60, '3 passages · 40 questions', '/exam/reading', AppColors.success),
      ('Writing', Icons.edit_rounded, 60, 'Task 1 & Task 2', '/writing', AppColors.info),
      ('Speaking', Icons.mic_rounded, 15, '3 parts · recorded', '/speaking', AppColors.primary),
    ];
    final total = sections.fold<int>(0, (n, s) => n + s.$3);

    return Scaffold(
      appBar: AppBar(title: const Text('Full IELTS exam')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          if (locked) const UpgradeBanner('The full IELTS exam'),
          GradientCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  width: 52, height: 52,
                  decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(16)),
                  child: const Icon(Icons.school_rounded, color: Colors.white, size: 26),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Complete mock exam', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                    Text('Sit all four sections back-to-back under real timing.', style: TextStyle(color: Colors.white70, fontSize: 12.5)),
                  ]),
                ),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                const Icon(Icons.schedule_rounded, color: Colors.white70, size: 16),
                const SizedBox(width: 4),
                Text('Approx. ${total ~/ 60}h ${total % 60}m', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                const Spacer(),
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.primary),
                  onPressed: () => context.push('/listening'),
                  child: const Text('Begin'),
                ),
              ]),
            ]),
          ),
          const SizedBox(height: 16),
          ...sections.asMap().entries.map((e) {
            final s = e.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: FluentaCard(
                padding: const EdgeInsets.all(14),
                child: Row(children: [
                  Container(
                    width: 32, height: 32,
                    decoration: const BoxDecoration(color: AppColors.muted, shape: BoxShape.circle),
                    alignment: Alignment.center,
                    child: Text('${e.key + 1}', style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.mutedForeground)),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(color: s.$6.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                    child: Icon(s.$2, color: s.$6),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(s.$1, style: const TextStyle(fontWeight: FontWeight.w800)),
                      Text(s.$4, style: const TextStyle(fontSize: 12.5, color: AppColors.mutedForeground)),
                    ]),
                  ),
                  Text('${s.$3}m', style: const TextStyle(fontSize: 12.5, color: AppColors.mutedForeground)),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(minimumSize: const Size(0, 40), padding: const EdgeInsets.symmetric(horizontal: 12)),
                    onPressed: () => context.push(s.$5),
                    child: const Text('Open'),
                  ),
                ]),
              ),
            );
          }),
        ],
      ),
    );
  }
}
