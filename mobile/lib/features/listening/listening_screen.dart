import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../mock/data.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../utils/format.dart';
import '../../widgets/grading_overlay.dart';
import '../../widgets/ui.dart';
import '../exam/question_group_view.dart';

class ListeningScreen extends StatefulWidget {
  const ListeningScreen({super.key});
  @override
  State<ListeningScreen> createState() => _ListeningScreenState();
}

class _ListeningScreenState extends State<ListeningScreen> {
  int _section = 0;
  final Map<String, String> _answers = {};
  bool _playing = false;
  int _t = 0;
  final int _total = 30 * 60;
  Timer? _timer;

  void _togglePlay() {
    setState(() => _playing = !_playing);
    _timer?.cancel();
    if (_playing) {
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        setState(() => _t = _t < _total ? _t + 1 : _total);
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _submit() async {
    await showGradingDialog(context);
    if (mounted) context.go('/progress');
  }

  @override
  Widget build(BuildContext context) {
    final locked = context.watch<AppState>().isLocked('listening');
    final progress = _t / _total;
    return Scaffold(
      appBar: AppBar(title: const Text('Listening practice')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          if (locked) const UpgradeBanner('Listening practice'),
          // audio player
          FluentaCard(
            child: Column(children: [
              Row(children: [
                FilledButton(
                  style: FilledButton.styleFrom(shape: const CircleBorder(), minimumSize: const Size(52, 52), padding: EdgeInsets.zero),
                  onPressed: _togglePlay,
                  child: Icon(_playing ? Icons.pause_rounded : Icons.play_arrow_rounded, size: 26),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(children: [
                    SizedBox(
                      height: 34,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: List.generate(40, (i) {
                          final active = (i / 40) <= progress;
                          final h = 8 + ((i * 7) % 26).toDouble();
                          return Expanded(
                            child: Container(
                              margin: const EdgeInsets.symmetric(horizontal: 0.8),
                              height: h,
                              decoration: BoxDecoration(
                                color: active ? AppColors.primary : AppColors.border,
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                          );
                        }),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text('${pad2(_t ~/ 60)}:${pad2(_t % 60)}', style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
                      Text('${pad2(_total ~/ 60)}:${pad2(_total % 60)}', style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
                    ]),
                  ]),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.volume_up_rounded, color: AppColors.mutedForeground),
              ]),
              const SizedBox(height: 8),
              const Text('In the real test the audio plays once. This is a preview player — playback is simulated.',
                  style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
            ]),
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 62,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: listeningSections.asMap().entries.map((e) {
                final sel = _section == e.key;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => setState(() => _section = e.key),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: sel ? AppColors.primary : AppColors.border),
                        color: sel ? AppColors.primary.withValues(alpha: 0.06) : null,
                      ),
                      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Section ${e.value.number}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                        Text('${e.value.questionCount} questions', style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                      ]),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 14),
          FluentaCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(color: AppColors.secondary.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.headphones_rounded, color: AppColors.onSecondary, size: 18),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Section ${listeningSections[_section].number}', style: const TextStyle(fontWeight: FontWeight.w800)),
                    Text(listeningSections[_section].context, style: const TextStyle(fontSize: 12.5, color: AppColors.mutedForeground)),
                  ]),
                ),
              ]),
              const SizedBox(height: 12),
              Text(listeningDemoGroup.instructions, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13)),
              const SizedBox(height: 12),
              QuestionGroupView(group: listeningDemoGroup, answers: _answers, onChanged: (id, v) => setState(() => _answers[id] = v)),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.success),
                  onPressed: _submit,
                  icon: const Icon(Icons.flag_rounded, size: 18),
                  label: const Text('Submit for grading'),
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}
