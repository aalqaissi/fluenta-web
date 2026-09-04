import 'dart:async';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../mock/passages.dart';
import '../../models/models.dart';
import '../../services/mock_api.dart';
import '../../theme/app_colors.dart';
import '../../utils/format.dart';
import '../../widgets/grading_overlay.dart';
import '../exam/question_group_view.dart';

const _highlightFill = {
  'yellow': Color(0xFFFDE68A),
  'green': Color(0xFFBBF7D0),
  'blue': Color(0xFFBAE6FD),
  'rose': Color(0xFFFECDD3),
  'purple': Color(0xFFE9D5FF),
};
const _highlightSwatch = {
  'yellow': Color(0xFFFCD34D),
  'green': Color(0xFF4ADE80),
  'blue': Color(0xFF38BDF8),
  'rose': Color(0xFFFB7185),
  'purple': Color(0xFFC084FC),
};

class ReadingRunnerScreen extends StatefulWidget {
  const ReadingRunnerScreen({super.key});
  @override
  State<ReadingRunnerScreen> createState() => _ReadingRunnerScreenState();
}

class _ReadingRunnerScreenState extends State<ReadingRunnerScreen> {
  final exam = readingExam;
  int _pIdx = 0;
  int _tab = 0; // 0 = passage, 1 = questions
  final Map<String, String> _answers = {};
  final Map<String, String> _highlights = {};
  String? _activeColor;
  String _find = '';
  late int _timeLeft = exam.durationSec;
  Timer? _timer;
  final List<TapGestureRecognizer> _recognizers = [];

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_timeLeft <= 0) {
        _submit();
      } else {
        setState(() => _timeLeft--);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final r in _recognizers) {
      r.dispose();
    }
    super.dispose();
  }

  int get _totalQ => exam.passages.fold(0, (n, p) => n + p.groups.fold(0, (m, g) => m + g.questions.length));
  int get _answered => _answers.values.where((v) => v.trim().isNotEmpty).length;

  Future<void> _submit() async {
    _timer?.cancel();
    final attempt = scoreReading(_answers, exam.durationSec - _timeLeft);
    AttemptStore.lastReading = attempt;
    await showGradingDialog(context);
    if (mounted) context.go('/results/reading');
  }

  @override
  Widget build(BuildContext context) {
    final passage = exam.passages[_pIdx];
    final low = _timeLeft < 120;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back_rounded), onPressed: () => context.canPop() ? context.pop() : context.go('/')),
        titleSpacing: 0,
        title: const Text('Fluenta Reading', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        actions: [
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
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
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: Column(
        children: [
          // sub-header: passage info + segmented toggle
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.border))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${passage.label} · Passage ${passage.passageNumber} of ${passage.totalPassages}',
                    style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                const SizedBox(height: 8),
                SegmentedButton<int>(
                  style: const ButtonStyle(visualDensity: VisualDensity.compact),
                  segments: [
                    const ButtonSegment(value: 0, label: Text('Passage')),
                    ButtonSegment(value: 1, label: Text('Questions $_answered/$_totalQ')),
                  ],
                  selected: {_tab},
                  onSelectionChanged: (s) => setState(() => _tab = s.first),
                ),
              ],
            ),
          ),
          Expanded(child: _tab == 0 ? _passageTab(passage) : _questionsTab(passage)),
          _bottomBar(),
        ],
      ),
    );
  }

  Widget _passageTab(Passage passage) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          decoration: const InputDecoration(prefixIcon: Icon(Icons.search_rounded), hintText: 'Find text…'),
          onChanged: (v) => setState(() => _find = v),
        ),
        const SizedBox(height: 12),
        Row(children: [
          const Icon(Icons.brush_rounded, size: 16, color: AppColors.mutedForeground),
          const SizedBox(width: 8),
          ..._highlightSwatch.entries.map((e) {
            final active = _activeColor == e.key;
            return GestureDetector(
              onTap: () => setState(() => _activeColor = active ? null : e.key),
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                width: 26, height: 26,
                decoration: BoxDecoration(
                  color: e.value,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: active ? AppColors.foreground : Colors.transparent, width: 2),
                ),
              ),
            );
          }),
          const Spacer(),
          if (_highlights.isNotEmpty)
            TextButton(onPressed: () => setState(() => _highlights.clear()), child: const Text('Clear', style: TextStyle(color: AppColors.destructive))),
        ]),
        if (_activeColor != null)
          const Padding(
            padding: EdgeInsets.only(top: 4),
            child: Text('Tap a sentence to highlight it.', style: TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
          ),
        const SizedBox(height: 12),
        Text(passage.headline, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, height: 1.25)),
        const SizedBox(height: 12),
        ..._buildParagraphs(passage),
        const SizedBox(height: 8),
      ],
    );
  }

  List<Widget> _buildParagraphs(Passage passage) {
    for (final r in _recognizers) {
      r.dispose();
    }
    _recognizers.clear();
    final widgets = <Widget>[];
    for (var pi = 0; pi < passage.paragraphs.length; pi++) {
      final sentences = _splitSentences(passage.paragraphs[pi]);
      final spans = <TextSpan>[];
      for (var si = 0; si < sentences.length; si++) {
        final key = '${passage.id}:$pi:$si';
        final hl = _highlights[key];
        final matchesFind = _find.trim().length >= 2 && sentences[si].toLowerCase().contains(_find.toLowerCase());
        Color? bg;
        if (hl != null) {
          bg = _highlightFill[hl];
        } else if (matchesFind) {
          bg = AppColors.secondary.withValues(alpha: 0.35);
        }
        final recognizer = TapGestureRecognizer()
          ..onTap = () {
            if (_activeColor == null) return;
            setState(() {
              if (_highlights[key] == _activeColor) {
                _highlights.remove(key);
              } else {
                _highlights[key] = _activeColor!;
              }
            });
          };
        _recognizers.add(recognizer);
        spans.add(TextSpan(text: sentences[si], style: TextStyle(backgroundColor: bg), recognizer: recognizer));
      }
      widgets.add(Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Text.rich(TextSpan(children: spans), style: const TextStyle(fontSize: 15, height: 1.7, color: AppColors.foreground)),
      ));
    }
    return widgets;
  }

  List<String> _splitSentences(String p) {
    final matches = RegExp(r'[^.!?]+[.!?]?\s*').allMatches(p);
    final out = matches.map((m) => m.group(0)!).where((s) => s.isNotEmpty).toList();
    return out.isEmpty ? [p] : out;
  }

  Widget _questionsTab(Passage passage) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        for (final g in passage.groups) ...[
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: Text(g.rangeLabel, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15))),
            const SizedBox(width: 8),
            Flexible(
              child: Text(g.type.label,
                  textAlign: TextAlign.end,
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.mutedForeground)),
            ),
          ]),
          const SizedBox(height: 6),
          Text(g.instructions, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13)),
          const SizedBox(height: 12),
          QuestionGroupView(group: g, answers: _answers, onChanged: (id, v) => setState(() => _answers[id] = v)),
          const SizedBox(height: 20),
        ],
      ],
    );
  }

  Widget _bottomBar() {
    final isLast = _pIdx == exam.passages.length - 1;
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: const BoxDecoration(color: AppColors.surface, border: Border(top: BorderSide(color: AppColors.border))),
        child: Row(children: [
          OutlinedButton(
            style: OutlinedButton.styleFrom(minimumSize: const Size(0, 46), padding: const EdgeInsets.symmetric(horizontal: 14)),
            onPressed: _pIdx == 0 ? null : () => setState(() => _pIdx--),
            child: const Icon(Icons.arrow_back_rounded, size: 18),
          ),
          Expanded(
            child: Center(
              child: Row(mainAxisSize: MainAxisSize.min, children: List.generate(exam.passages.length, (i) {
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: 8, height: 8,
                  decoration: BoxDecoration(color: i == _pIdx ? AppColors.primary : AppColors.border, shape: BoxShape.circle),
                );
              })),
            ),
          ),
          if (isLast)
            FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: AppColors.success, minimumSize: const Size(0, 46)),
              onPressed: _submit,
              icon: const Icon(Icons.flag_rounded, size: 18),
              label: const Text('Submit'),
            )
          else
            FilledButton.icon(
              style: FilledButton.styleFrom(minimumSize: const Size(0, 46)),
              onPressed: () => setState(() => _pIdx++),
              icon: const Icon(Icons.arrow_forward_rounded, size: 18),
              label: const Text('Next'),
            ),
        ]),
      ),
    );
  }
}
