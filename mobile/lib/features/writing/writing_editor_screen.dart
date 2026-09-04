import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../mock/data.dart';
import '../../services/mock_api.dart';
import '../../theme/app_colors.dart';
import '../../utils/format.dart';
import '../../widgets/grading_overlay.dart';
import '../../widgets/ui.dart';

class WritingEditorScreen extends StatefulWidget {
  final String taskId;
  const WritingEditorScreen({super.key, required this.taskId});
  @override
  State<WritingEditorScreen> createState() => _WritingEditorScreenState();
}

class _WritingEditorScreenState extends State<WritingEditorScreen> {
  late final task = writingTasks.firstWhere((t) => t.id == widget.taskId, orElse: () => writingTasks.first);
  late final _controller = TextEditingController(text: sampleWritingResult.answer);
  late int _timeLeft = task.durationSec;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => setState(() => _timeLeft = _timeLeft > 0 ? _timeLeft - 1 : 0));
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  int get _words => _controller.text.trim().isEmpty ? 0 : _controller.text.trim().split(RegExp(r'\s+')).length;

  Future<void> _submit() async {
    _timer?.cancel();
    AttemptStore.lastWriting = WritingAttempt(taskId: task.id, answer: _controller.text, wordCount: _words);
    await showGradingDialog(context);
    if (mounted) context.go('/results/writing/${task.id}');
  }

  @override
  Widget build(BuildContext context) {
    final enough = _words >= task.minWords;
    final low = _timeLeft < 120;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back_rounded), onPressed: () => context.pop()),
        title: Text('Writing · Task ${task.taskNumber}'),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: low ? AppColors.destructive.withValues(alpha: 0.1) : AppColors.muted,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.schedule_rounded, size: 15, color: low ? AppColors.destructive : AppColors.foreground),
              const SizedBox(width: 4),
              Text('${pad2(_timeLeft ~/ 60)}:${pad2(_timeLeft % 60)}',
                  style: TextStyle(fontWeight: FontWeight.w800, color: low ? AppColors.destructive : AppColors.foreground)),
            ]),
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [
                      AppColors.primary.withValues(alpha: 0.1),
                      AppColors.secondary.withValues(alpha: 0.1),
                    ]),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const PillBadge('Prompt', color: AppColors.info, icon: Icons.auto_awesome),
                    const SizedBox(height: 8),
                    Text(task.prompt, style: const TextStyle(fontSize: 15, height: 1.5, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 6),
                    Text('Write at least ${task.minWords} words.', style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                  ]),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _controller,
                  maxLines: null,
                  minLines: 12,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(hintText: 'Start writing your response here…'),
                  style: const TextStyle(height: 1.5),
                ),
              ],
            ),
          ),
          SafeArea(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: const BoxDecoration(color: AppColors.surface, border: Border(top: BorderSide(color: AppColors.border))),
              child: Row(children: [
                Expanded(
                  child: Text('$_words words${enough ? ' · minimum reached' : ' · ${task.minWords - _words} to go'}',
                      style: TextStyle(fontWeight: FontWeight.w700, color: enough ? AppColors.success : AppColors.mutedForeground)),
                ),
                FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.success),
                  onPressed: _words < 5 ? null : _submit,
                  icon: const Icon(Icons.flag_rounded, size: 18),
                  label: const Text('Submit'),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}
