import 'package:flutter/material.dart';
import '../../mock/data.dart';
import '../../models/models.dart';
import '../../theme/app_colors.dart';
import '../../utils/format.dart';
import '../../widgets/modals.dart';
import '../../widgets/ui.dart';

class ProgressScreen extends StatefulWidget {
  const ProgressScreen({super.key});
  @override
  State<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen> {
  final List<RecentExam> _exams = List.of(recentExams);

  @override
  Widget build(BuildContext context) {
    final scored = sectionSummaries.where((s) => s.band != null).toList();
    SectionSummary? strongest, weakest;
    if (scored.isNotEmpty) {
      strongest = scored.reduce((a, b) => a.band! >= b.band! ? a : b);
      weakest = scored.reduce((a, b) => a.band! <= b.band! ? a : b);
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Progress')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Row(children: [
            Expanded(child: _summaryCard('Strongest section', strongest, AppColors.success, Icons.trending_up_rounded)),
            const SizedBox(width: 12),
            Expanded(child: _summaryCard('Needs improvement', weakest, AppColors.destructive, Icons.trending_down_rounded)),
          ]),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.85,
            children: sectionSummaries.map((s) {
              final vis = skillVisual(s.skill.name);
              return FluentaCard(
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text(s.skill.label, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground, fontWeight: FontWeight.w600)),
                    Icon(vis.icon, size: 16, color: vis.color),
                  ]),
                  const SizedBox(height: 4),
                  Text(formatBand(s.band), style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.bandTone(s.band))),
                  Text('${s.tests} tests', style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                ]),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),
          const SectionHeader('Recent exams'),
          ..._exams.map((e) {
            final vis = skillVisual(e.skill.name);
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: FluentaCard(
                padding: const EdgeInsets.all(14),
                child: Row(children: [
                  Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(color: vis.color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                    child: Icon(vis.icon, color: vis.color),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Flexible(child: Text(e.title, style: const TextStyle(fontWeight: FontWeight.w800))),
                        const SizedBox(width: 6),
                        _statusChip(e.status),
                      ]),
                      const SizedBox(height: 2),
                      Text(
                        '${e.date} · ${e.sectionsDone}/${e.sectionsTotal} sections${e.band != null ? ' · band ${formatBand(e.band)}' : ''}',
                        style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground),
                      ),
                    ]),
                  ),
                  IconButton(
                    onPressed: () async {
                      final ok = await showConfirm(context,
                          title: 'Delete exam?',
                          message: 'This permanently removes this attempt and its data. This cannot be undone.',
                          confirmLabel: 'Delete');
                      if (ok) {
                        setState(() => _exams.remove(e));
                        if (context.mounted) showToast(context, 'Exam deleted');
                      }
                    },
                    icon: const Icon(Icons.delete_outline_rounded, color: AppColors.mutedForeground, size: 20),
                  ),
                ]),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _summaryCard(String label, SectionSummary? s, Color color, IconData icon) {
    return FluentaCard(
      color: color.withValues(alpha: 0.06),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Icon(icon, size: 16, color: color), const SizedBox(width: 6), Flexible(child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12.5)))]),
        const SizedBox(height: 6),
        Text(s?.skill.label ?? '—', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        Text('Average: ${formatBand(s?.band)}', style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
      ]),
    );
  }

  Widget _statusChip(ExamStatus s) {
    final (label, color) = switch (s) {
      ExamStatus.completed => ('Completed', AppColors.success),
      ExamStatus.inProgress => ('In progress', AppColors.secondary),
      ExamStatus.notStarted => ('Not started', AppColors.mutedForeground),
    };
    return PillBadge(label, color: s == ExamStatus.inProgress ? AppColors.onSecondary : color);
  }
}
