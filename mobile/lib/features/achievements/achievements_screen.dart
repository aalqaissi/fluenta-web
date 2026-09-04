import 'package:flutter/material.dart';
import '../../mock/data.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui.dart';

class AchievementsScreen extends StatelessWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final earned = achievements.where((a) => a.earned).length;
    return Scaffold(
      appBar: AppBar(title: const Text('Achievements')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Row(children: [
            const Expanded(child: Text('Little wins that keep you moving toward your target band.', style: TextStyle(color: AppColors.mutedForeground))),
            PillBadge('$earned/${achievements.length}', color: AppColors.success),
          ]),
          const SizedBox(height: 14),
          ...achievements.map((a) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: FluentaCard(
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Container(
                      width: 48, height: 48,
                      decoration: BoxDecoration(
                        gradient: a.earned ? AppColors.warmGradient : null,
                        color: a.earned ? null : AppColors.muted,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(a.earned ? Icons.emoji_events_rounded : Icons.lock_outline_rounded,
                          color: a.earned ? Colors.white : AppColors.mutedForeground),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(a.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                        Text(a.description, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                        const SizedBox(height: 6),
                        if (a.earned)
                          PillBadge('Earned', color: AppColors.success)
                        else ...[
                          ClipRRect(borderRadius: BorderRadius.circular(999), child: LinearProgressIndicator(value: a.progress / 100, minHeight: 5)),
                          const SizedBox(height: 3),
                          Text('${a.progress}% there', style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                        ],
                      ]),
                    ),
                  ]),
                ),
              )),
        ],
      ),
    );
  }
}
