import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_state.dart';
import '../theme/app_colors.dart';
import '../utils/format.dart';
import 'ui.dart';

Future<void> showSetExamDateSheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (_) => const _SetExamDateSheet(),
  );
}

class _SetExamDateSheet extends StatefulWidget {
  const _SetExamDateSheet();
  @override
  State<_SetExamDateSheet> createState() => _SetExamDateSheetState();
}

class _SetExamDateSheetState extends State<_SetExamDateSheet> {
  int _months = 3;
  double _band = 7;

  DateTime get _date => DateTime(2026, 9 + _months, 2);
  int get _days => _date.difference(DateTime(2026, 9, 2)).inDays;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 16),
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.event_rounded, color: AppColors.primary),
            ),
            const SizedBox(height: 10),
            const Text('Set your exam date', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const Text('Track your preparation time and stay motivated.',
                style: TextStyle(color: AppColors.mutedForeground)),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [1, 2, 3, 6].map((m) {
                final sel = _months == m;
                return ChoiceChip(
                  label: Text('$m Month${m > 1 ? 's' : ''}'),
                  selected: sel,
                  onSelected: (_) => setState(() => _months = m),
                  selectedColor: AppColors.primary.withValues(alpha: 0.12),
                  labelStyle: TextStyle(fontWeight: FontWeight.w700, color: sel ? AppColors.primary : AppColors.mutedForeground),
                  shape: StadiumBorder(side: BorderSide(color: sel ? AppColors.primary : AppColors.border)),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            const Text('Exam date', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.muted.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(14)),
              child: Text(longDate(_date), style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
            const SizedBox(height: 16),
            const Text('Target band score', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            DropdownButtonFormField<double>(
              initialValue: _band,
              items: [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]
                  .map((b) => DropdownMenuItem(value: b.toDouble(), child: Text('${formatBand(b.toDouble())}${b == 7 ? '  · Recommended' : ''}')))
                  .toList(),
              onChanged: (v) => setState(() => _band = v ?? 7),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.info.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14)),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome, color: AppColors.info, size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text('You have $_days days to prepare. Stay consistent to reach band ${formatBand(_band)}.',
                        style: const TextStyle(fontSize: 13)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      context.read<AppState>().clearExamDate();
                      Navigator.pop(context);
                    },
                    child: const Text('Clear'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: () {
                      context.read<AppState>().setExamDate(_date, _band);
                      Navigator.pop(context);
                      showToast(context, 'Exam date set!', description: '$_days days to prepare.');
                    },
                    child: const Text('Save & start countdown'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> showFeedbackSheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (_) => const _FeedbackSheet(),
  );
}

class _FeedbackSheet extends StatefulWidget {
  const _FeedbackSheet();
  @override
  State<_FeedbackSheet> createState() => _FeedbackSheetState();
}

class _FeedbackSheetState extends State<_FeedbackSheet> {
  int _rating = 0;
  final _subject = TextEditingController();
  final _message = TextEditingController();

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            const Text('Share your feedback', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const Text('We value your input! Let us know how we can improve.',
                style: TextStyle(color: AppColors.mutedForeground)),
            const SizedBox(height: 16),
            const Text('Overall rating', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Row(
              children: List.generate(5, (i) {
                final on = i < _rating;
                return IconButton(
                  onPressed: () => setState(() => _rating = i + 1),
                  icon: Icon(on ? Icons.star_rounded : Icons.star_border_rounded,
                      color: on ? AppColors.secondary : AppColors.border, size: 32),
                );
              }),
            ),
            const SizedBox(height: 8),
            const Text('Subject', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            TextField(controller: _subject, decoration: const InputDecoration(hintText: 'Brief summary of your feedback')),
            const SizedBox(height: 14),
            const Text('Message', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            TextField(controller: _message, maxLines: 4, decoration: const InputDecoration(hintText: 'Tell us more…')),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  showToast(context, 'Thanks for your feedback!', description: 'We read every note.');
                },
                icon: const Icon(Icons.send_rounded, size: 18),
                label: const Text('Submit feedback'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Reusable confirm dialog.
Future<bool> showConfirm(
  BuildContext context, {
  required String title,
  required String message,
  String confirmLabel = 'Confirm',
  bool destructive = true,
}) async {
  final res = await showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(
          style: destructive ? FilledButton.styleFrom(backgroundColor: AppColors.destructive) : null,
          onPressed: () => Navigator.pop(context, true),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return res ?? false;
}
