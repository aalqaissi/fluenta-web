import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/brand.dart';
import '../../mock/data.dart';
import '../../models/models.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../utils/format.dart';
import '../../widgets/modals.dart';
import '../../widgets/ui.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final user = app.user;
    final isPro = app.isPro;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(children: [
          Container(
            width: 30, height: 30,
            decoration: BoxDecoration(gradient: AppColors.warmGradient, borderRadius: BorderRadius.circular(9)),
            alignment: Alignment.center,
            child: const Text('F', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
          ),
          const SizedBox(width: 8),
          const Text(Brand.name),
        ]),
        actions: [
          IconButton(onPressed: () => showFeedbackSheet(context), icon: const Icon(Icons.forum_outlined)),
          IconButton(onPressed: () {}, icon: const Icon(Icons.notifications_none_rounded)),
          const SizedBox(width: 4),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          // hero
          GradientCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const PillBadge('Your IELTS journey', color: Colors.white, bg: Color(0x26FFFFFF), icon: Icons.auto_awesome),
                const SizedBox(height: 10),
                Text(
                  isPro ? 'Welcome back, ${user.name.split(' ').first} 👋' : 'Unlock your full potential',
                  style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                Text(
                  isPro
                      ? 'Track your progress, spot weak areas, and reach your target band with personalized AI coaching.'
                      : 'Get unlimited practice, all four sections, and AI feedback across every skill.',
                  style: const TextStyle(color: Colors.white70, fontSize: 13.5, height: 1.4),
                ),
                const SizedBox(height: 14),
                Row(children: [
                  if (isPro)
                    FilledButton.icon(
                      style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.primary),
                      onPressed: () => showFeedbackSheet(context),
                      icon: const Icon(Icons.forum_outlined, size: 18),
                      label: const Text('Give feedback'),
                    )
                  else ...[
                    FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.primary),
                      onPressed: () => context.push('/checkout'),
                      child: const Text('Upgrade to Pro'),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: Colors.white24, foregroundColor: Colors.white),
                      onPressed: () => context.push('/reading'),
                      child: const Text('Try free'),
                    ),
                  ],
                ]),
              ],
            ),
          ),
          const SizedBox(height: 20),

          const SectionHeader('Quick start practice', subtitle: 'Jump right into your next session.'),
          _QuickStartGrid(),
          const SizedBox(height: 12),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: isPro ? AppColors.primary : AppColors.secondary,
              foregroundColor: isPro ? Colors.white : AppColors.onSecondary,
              minimumSize: const Size(double.infinity, 54),
            ),
            onPressed: () => context.push('/full-exam'),
            icon: const Icon(Icons.school_rounded),
            label: Text(isPro ? 'Start full IELTS exam · 2.5–3 hrs' : 'Unlock full IELTS exam'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 50)),
            onPressed: () => context.push('/coach'),
            icon: const Icon(Icons.smart_toy_outlined, color: AppColors.info),
            label: Text('Chat with ${Brand.coachName}'),
          ),
          const SizedBox(height: 20),

          // plan card
          FluentaCard(
            color: isPro ? const Color(0xFFF1FAF3) : null,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Your current plan', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    PillBadge(isPro ? user.planLabel : 'Free', color: isPro ? AppColors.success : AppColors.mutedForeground),
                  ],
                ),
                const SizedBox(height: 10),
                if (isPro) ...[
                  Row(children: [
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.all_inclusive_rounded, color: AppColors.success),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Unlimited access', style: TextStyle(fontWeight: FontWeight.w700)),
                        Text('Practice as much as you need.', style: TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                      ]),
                    ),
                  ]),
                  const SizedBox(height: 8),
                  Text('Renews in ${user.renewsInDays} days', style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                  const SizedBox(height: 8),
                  OutlinedButton(onPressed: () => context.push('/checkout'), child: const Text('Manage plan')),
                ] else ...[
                  const Text('Upgrade for all four sections and unlimited AI feedback.',
                      style: TextStyle(color: AppColors.mutedForeground)),
                  const SizedBox(height: 10),
                  FilledButton(onPressed: () => context.push('/checkout'), child: const Text('Upgrade to Pro')),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          const _ExamCountdownCard(),
          const SizedBox(height: 16),
          const _StreakCard(),
          const SizedBox(height: 16),

          // progress to target
          FluentaCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Progress report', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const Text('Your performance trends and target progress.',
                    style: TextStyle(color: AppColors.mutedForeground, fontSize: 13)),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Progress to target', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    Text('3.0 / ${formatBand(user.targetBand)}', style: const TextStyle(fontWeight: FontWeight.w800)),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(value: 3 / user.targetBand, minHeight: 10),
                ),
                const SizedBox(height: 6),
                Text('${((3 / user.targetBand) * 100).round()}% of target achieved',
                    style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
                const SizedBox(height: 14),
                Row(
                  children: sectionSummaries.map((s) {
                    return Expanded(
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(12)),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(s.skill.label, style: const TextStyle(fontSize: 10.5, color: AppColors.mutedForeground, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 2),
                          Text(formatBand(s.band), style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.bandTone(s.band))),
                        ]),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickStartGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final items = [
      ('reading', 'Reading', 'Comprehension', '/reading'),
      ('writing', 'Writing', 'Task 1 & 2', '/writing'),
      ('listening', 'Listening', 'Audio practice', '/listening'),
      ('speaking', 'Speaking', 'Voice recording', '/speaking'),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.38,
      children: items.map((it) {
        final vis = skillVisual(it.$1);
        final locked = app.isLocked(it.$1);
        return FluentaCard(
          padding: const EdgeInsets.all(14),
          onTap: () => context.push(it.$4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 42, height: 42,
                    decoration: BoxDecoration(color: vis.color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                    child: Icon(vis.icon, color: vis.color, size: 22),
                  ),
                  if (locked) const LockPill(),
                ],
              ),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(it.$2, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                Text(locked ? 'Preview available' : it.$3, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
              ]),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _ExamCountdownCard extends StatefulWidget {
  const _ExamCountdownCard();
  @override
  State<_ExamCountdownCard> createState() => _ExamCountdownCardState();
}

class _ExamCountdownCardState extends State<_ExamCountdownCard> {
  Timer? _t;
  @override
  void initState() {
    super.initState();
    _t = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _t?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().user;
    final date = user.examDate;
    return FluentaCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Exam countdown', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              IconButton(
                visualDensity: VisualDensity.compact,
                onPressed: () => showSetExamDateSheet(context),
                icon: const Icon(Icons.edit_outlined, size: 18),
              ),
            ],
          ),
          if (date == null)
            Column(children: [
              const SizedBox(height: 4),
              const Text('Set your exam date to start a countdown.', style: TextStyle(color: AppColors.mutedForeground)),
              const SizedBox(height: 10),
              FilledButton(onPressed: () => showSetExamDateSheet(context), child: const Text('Set exam date')),
            ])
          else ...[
            Text(longDate(date), style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
            const SizedBox(height: 10),
            Builder(builder: (_) {
              final diff = DateTime(date.year, date.month, date.day, 9).difference(DateTime.now());
              final d = diff.inDays;
              final h = diff.inHours % 24;
              final m = diff.inMinutes % 60;
              final s = diff.inSeconds % 60;
              final units = [(d, 'Days'), (h, 'Hours'), (m, 'Min'), (s, 'Sec')];
              return Row(
                children: units.map((u) {
                  return Expanded(
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(color: AppColors.muted.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
                      child: Column(children: [
                        Text(pad2(u.$1 < 0 ? 0 : u.$1), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                        Text(u.$2, style: const TextStyle(fontSize: 10.5, color: AppColors.mutedForeground)),
                      ]),
                    ),
                  );
                }).toList(),
              );
            }),
            const SizedBox(height: 12),
            Row(children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: AppColors.info.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.track_changes_rounded, color: AppColors.info, size: 18),
              ),
              const SizedBox(width: 10),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Target band score', style: TextStyle(color: AppColors.mutedForeground, fontSize: 11.5)),
                Text(formatBand(user.targetBand), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              ]),
            ]),
          ],
        ],
      ),
    );
  }
}

class _StreakCard extends StatelessWidget {
  const _StreakCard();
  @override
  Widget build(BuildContext context) {
    final streak = context.watch<AppState>().user.streak;
    const intensity = [AppColors.muted, Color(0x40EF6C57), Color(0x8CEF6C57), AppColors.primary];
    return FluentaCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.local_fire_department_rounded, color: AppColors.primary, size: 18),
            SizedBox(width: 6),
            Text('Study streak', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Current streak', style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
                  Text('${streak.current}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primary)),
                  const Text('days in a row', style: TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                ]),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Best streak', style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
                  Text('${streak.best}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.success)),
                  const Text('personal record', style: TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                ]),
              ),
            ),
          ]),
          const SizedBox(height: 14),
          const Text('Last 30 days', style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 5,
            runSpacing: 5,
            children: streak.last30.map((v) {
              return Container(
                width: 18, height: 18,
                decoration: BoxDecoration(color: intensity[v], borderRadius: BorderRadius.circular(5)),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
