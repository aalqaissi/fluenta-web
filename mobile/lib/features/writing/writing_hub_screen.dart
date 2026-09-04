import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../mock/data.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui.dart';

class WritingHubScreen extends StatelessWidget {
  const WritingHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final locked = context.watch<AppState>().isLocked('writing');
    return Scaffold(
      appBar: AppBar(title: const Text('Writing practice')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          if (locked) const UpgradeBanner('Writing practice'),
          ...writingTasks.map((t) => Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: FluentaCard(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(color: AppColors.info.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                        child: const Icon(Icons.edit_rounded, color: AppColors.info),
                      ),
                      const SizedBox(width: 12),
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        PillBadge('Task ${t.taskNumber}', color: AppColors.info),
                        const SizedBox(height: 2),
                        Text(t.kind, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
                      ]),
                    ]),
                    const SizedBox(height: 12),
                    Text(t.prompt, style: const TextStyle(fontSize: 14, height: 1.45)),
                    const SizedBox(height: 12),
                    Row(children: [
                      Icon(Icons.schedule_rounded, size: 15, color: AppColors.mutedForeground),
                      const SizedBox(width: 4),
                      Text('${t.durationSec ~/ 60} min', style: const TextStyle(fontSize: 12.5, color: AppColors.mutedForeground)),
                      const SizedBox(width: 14),
                      Icon(Icons.notes_rounded, size: 15, color: AppColors.mutedForeground),
                      const SizedBox(width: 4),
                      Text('min ${t.minWords} words', style: const TextStyle(fontSize: 12.5, color: AppColors.mutedForeground)),
                    ]),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: () => context.push('/exam/writing/${t.id}'),
                        icon: const Icon(Icons.play_arrow_rounded),
                        label: const Text('Start writing'),
                      ),
                    ),
                  ]),
                ),
              )),
        ],
      ),
    );
  }
}
