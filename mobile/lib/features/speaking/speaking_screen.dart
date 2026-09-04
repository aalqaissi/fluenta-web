import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../mock/data.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../utils/format.dart';
import '../../widgets/ui.dart';

class SpeakingScreen extends StatefulWidget {
  const SpeakingScreen({super.key});
  @override
  State<SpeakingScreen> createState() => _SpeakingScreenState();
}

class _SpeakingScreenState extends State<SpeakingScreen> {
  int _part = 0;
  bool _recording = false;
  bool _done = false;
  int _elapsed = 0;
  Timer? _timer;

  void _toggle() {
    if (_recording) {
      _timer?.cancel();
      setState(() {
        _recording = false;
        _done = true;
      });
    } else {
      setState(() => _recording = true);
      _timer = Timer.periodic(const Duration(seconds: 1), (_) => setState(() => _elapsed++));
    }
  }

  void _reset() {
    _timer?.cancel();
    setState(() {
      _recording = false;
      _done = false;
      _elapsed = 0;
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locked = context.watch<AppState>().isLocked('speaking');
    final part = speakingParts[_part];
    return Scaffold(
      appBar: AppBar(title: const Text('Speaking practice')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          if (locked) const UpgradeBanner('Speaking practice'),
          SizedBox(
            height: 62,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: speakingParts.asMap().entries.map((e) {
                final sel = _part == e.key;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () {
                      setState(() => _part = e.key);
                      _reset();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: sel ? AppColors.primary : AppColors.border),
                        color: sel ? AppColors.primary.withValues(alpha: 0.06) : null,
                      ),
                      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Part ${e.value.number}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                        Text(e.value.title, style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                      ]),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 14),
          if (part.cueCard != null)
            FluentaCard(
              border: Border.all(color: AppColors.border),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const PillBadge('Cue card', color: AppColors.onSecondary, bg: Color(0x26F5A524)),
                const SizedBox(height: 8),
                Text(part.cueCard!, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                const Text('You should say:', style: TextStyle(color: AppColors.mutedForeground, fontSize: 13)),
                const SizedBox(height: 4),
                ...part.bullets!.map((b) => Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: Text('•  $b', style: const TextStyle(fontSize: 13.5)),
                    )),
              ]),
            )
          else
            FluentaCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const PillBadge('Examiner questions', color: AppColors.info),
                const SizedBox(height: 10),
                ...part.questions.asMap().entries.map((e) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Container(
                          width: 24, height: 24,
                          decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), shape: BoxShape.circle),
                          alignment: Alignment.center,
                          child: Text('${e.key + 1}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primary)),
                        ),
                        const SizedBox(width: 10),
                        Expanded(child: Text(e.value, style: const TextStyle(fontSize: 14, height: 1.4))),
                      ]),
                    )),
              ]),
            ),
          const SizedBox(height: 14),
          FluentaCard(
            child: Column(children: [
              GestureDetector(
                onTap: _toggle,
                child: Container(
                  width: 90, height: 90,
                  decoration: BoxDecoration(
                    gradient: _recording ? null : AppColors.warmGradient,
                    color: _recording ? AppColors.destructive : null,
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: (_recording ? AppColors.destructive : AppColors.primary).withValues(alpha: 0.35), blurRadius: 20)],
                  ),
                  child: Icon(_recording ? Icons.stop_rounded : Icons.mic_rounded, color: Colors.white, size: 38),
                ),
              ),
              const SizedBox(height: 10),
              Text('${_recording ? 'Recording…' : _done ? 'Recorded' : 'Tap to record'} · ${pad2(_elapsed ~/ 60)}:${pad2(_elapsed % 60)}',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              if (_done)
                TextButton.icon(onPressed: _reset, icon: const Icon(Icons.refresh_rounded, size: 16), label: const Text('Re-record')),
              const Text('Microphone is simulated in this preview.', style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
            ]),
          ),
          const SizedBox(height: 14),
          FluentaCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Row(children: [
                Icon(Icons.auto_awesome, color: AppColors.primary, size: 18),
                SizedBox(width: 6),
                Text('AI feedback', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
              ]),
              const SizedBox(height: 8),
              if (!_done)
                const Text('Record your answer to see a band estimate and coaching notes for each speaking criterion.',
                    style: TextStyle(color: AppColors.mutedForeground, fontSize: 13))
              else ...[
                ...sampleSpeakingFeedback.map((f) => Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(12)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          Text(f.label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                          Text(formatBand(f.band), style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.bandTone(f.band))),
                        ]),
                        const SizedBox(height: 4),
                        Text(f.note, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                      ]),
                    )),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => context.go('/coach'),
                    icon: const Icon(Icons.smart_toy_outlined, size: 18),
                    label: const Text('Discuss with Fluenta Coach'),
                  ),
                ),
              ],
            ]),
          ),
        ],
      ),
    );
  }
}
