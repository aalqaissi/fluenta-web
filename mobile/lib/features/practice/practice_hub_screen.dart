import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui.dart';

class PracticeHubScreen extends StatelessWidget {
  const PracticeHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final items = [
      ('reading', 'Reading', '3 passages · all 11 question types', '/reading', null),
      ('writing', 'Writing', 'Task 1 & 2 with AI feedback', '/writing', null),
      ('listening', 'Listening', '4 sections, played once', '/listening', 'listening'),
      ('speaking', 'Speaking', '3 parts with pronunciation feedback', '/speaking', 'speaking'),
      ('general', 'Full IELTS exam', 'All four sections, timed', '/full-exam', 'full-exam'),
      ('reading', 'Mock exams', 'Take or upload your own', '/mock-exams', null),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Practice')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          const Text('Choose a skill to practice', style: TextStyle(color: AppColors.mutedForeground)),
          const SizedBox(height: 12),
          ...items.map((it) {
            final vis = skillVisual(it.$1);
            final locked = it.$5 != null && app.isLocked(it.$5!);
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: FluentaCard(
                onTap: () => context.push(it.$4),
                child: Row(children: [
                  Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(color: vis.color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
                    child: Icon(vis.icon, color: vis.color),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Text(it.$2, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
                        if (locked) ...[const SizedBox(width: 8), const LockPill()],
                      ]),
                      const SizedBox(height: 2),
                      Text(it.$3, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                    ]),
                  ),
                  const Icon(Icons.chevron_right_rounded, color: AppColors.mutedForeground),
                ]),
              ),
            );
          }),
        ],
      ),
    );
  }
}
