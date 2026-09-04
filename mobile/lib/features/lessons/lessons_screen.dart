import 'package:flutter/material.dart';
import '../../mock/data.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui.dart';

class LessonsScreen extends StatefulWidget {
  const LessonsScreen({super.key});
  @override
  State<LessonsScreen> createState() => _LessonsScreenState();
}

class _LessonsScreenState extends State<LessonsScreen> {
  String _filter = 'all';

  IconData _kindIcon(String kind) => switch (kind) {
        'Video' => Icons.play_circle_outline_rounded,
        'Article' => Icons.article_outlined,
        _ => Icons.fitness_center_rounded,
      };

  @override
  Widget build(BuildContext context) {
    final list = lessons.where((l) => _filter == 'all' || l.skill == _filter).toList();
    const filters = ['all', 'reading', 'writing', 'listening', 'speaking', 'general'];
    return Scaffold(
      appBar: AppBar(title: const Text('Lessons & library')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          const Text('Bite-sized lessons and drills to fix what\'s holding your band back.',
              style: TextStyle(color: AppColors.mutedForeground)),
          const SizedBox(height: 12),
          SizedBox(
            height: 38,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: filters.map((f) {
                final sel = _filter == f;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(f == 'all' ? 'All' : '${f[0].toUpperCase()}${f.substring(1)}'),
                    selected: sel,
                    onSelected: (_) => setState(() => _filter = f),
                    selectedColor: AppColors.primary.withValues(alpha: 0.12),
                    labelStyle: TextStyle(fontWeight: FontWeight.w700, color: sel ? AppColors.primary : AppColors.mutedForeground),
                    shape: StadiumBorder(side: BorderSide(color: sel ? AppColors.primary : AppColors.border)),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 12),
          ...list.map((l) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: FluentaCard(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                        child: Icon(_kindIcon(l.kind), color: AppColors.primary, size: 20),
                      ),
                      const Spacer(),
                      PillBadge(l.level, color: AppColors.mutedForeground),
                    ]),
                    const SizedBox(height: 10),
                    Text(l.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(l.summary, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13)),
                    const SizedBox(height: 10),
                    Row(children: [
                      const Icon(Icons.schedule_rounded, size: 14, color: AppColors.mutedForeground),
                      const SizedBox(width: 4),
                      Text('${l.minutes} min · ${l.kind}', style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                    ]),
                    if (l.progress > 0 && l.progress < 100) ...[
                      const SizedBox(height: 8),
                      ClipRRect(borderRadius: BorderRadius.circular(999), child: LinearProgressIndicator(value: l.progress / 100, minHeight: 5)),
                      const SizedBox(height: 4),
                      Text('${l.progress}% complete', style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                    ],
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: l.progress == 100
                          ? OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.check_circle_outline_rounded, size: 18, color: AppColors.success), label: const Text('Completed'))
                          : FilledButton(onPressed: () {}, child: Text(l.progress > 0 ? 'Continue' : 'Start lesson')),
                    ),
                  ]),
                ),
              )),
        ],
      ),
    );
  }
}
