import 'package:flutter/material.dart';
import '../../models/models.dart';
import '../../theme/app_colors.dart';

const _choiceTypes = {QuestionType.trueFalseNotGiven, QuestionType.yesNoNotGiven};
const _selectTypes = {
  QuestionType.matchingHeadings,
  QuestionType.matchingFeatures,
  QuestionType.matchingInformation,
  QuestionType.matchingSentenceEndings,
};
const _textTypes = {
  QuestionType.sentenceCompletion,
  QuestionType.summaryCompletion,
  QuestionType.shortAnswer,
  QuestionType.diagramLabel,
};

class QuestionGroupView extends StatelessWidget {
  final QuestionGroup group;
  final Map<String, String> answers;
  final void Function(String id, String value) onChanged;
  final bool review;
  const QuestionGroupView({
    super.key,
    required this.group,
    required this.answers,
    required this.onChanged,
    this.review = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_selectTypes.contains(group.type) && group.sharedOptions != null)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.muted.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: group.sharedOptions!.map((o) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: RichText(
                      text: TextSpan(style: const TextStyle(color: AppColors.foreground, fontSize: 13.5), children: [
                        TextSpan(text: '${o.key}  ', style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary)),
                        TextSpan(text: o.text),
                      ]),
                    ),
                  )).toList(),
            ),
          ),
        ...group.questions.map((q) => _questionCard(context, q)),
      ],
    );
  }

  Widget _questionCard(BuildContext context, Question q) {
    final val = answers[q.id] ?? '';
    final correct = review ? val.trim().toLowerCase() == q.correct.trim().toLowerCase() : null;
    final borderColor = review
        ? (correct! ? AppColors.success : AppColors.destructive)
        : AppColors.border;
    final bg = review
        ? (correct! ? AppColors.success.withValues(alpha: 0.06) : AppColors.destructive.withValues(alpha: 0.05))
        : AppColors.surface;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14), border: Border.all(color: borderColor)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 24, height: 24,
              decoration: BoxDecoration(
                color: review ? borderColor : AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: review
                  ? Icon(correct! ? Icons.check : Icons.close, size: 14, color: Colors.white)
                  : Text('${q.number}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primary)),
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(q.prompt, style: const TextStyle(fontSize: 14, height: 1.4, fontWeight: FontWeight.w500))),
          ]),
          if (q.wordLimit != null)
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 34),
              child: Text(q.wordLimit!, style: const TextStyle(fontSize: 10.5, letterSpacing: 0.3, color: AppColors.mutedForeground, fontWeight: FontWeight.w700)),
            ),
          Padding(
            padding: const EdgeInsets.only(top: 10, left: 34),
            child: _input(q, val),
          ),
          if (review && !(correct ?? true))
            Padding(
              padding: const EdgeInsets.only(top: 8, left: 34),
              child: Text('Correct answer: ${q.correct}', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.success)),
            ),
        ],
      ),
    );
  }

  Widget _input(Question q, String val) {
    if (_choiceTypes.contains(group.type)) {
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        children: (group.sharedOptions ?? []).map((o) => _pill(o.text, o.key, val, q.id)).toList(),
      );
    }
    if (group.type == QuestionType.multipleChoice) {
      return Column(
        children: (q.options ?? []).map((o) {
          final sel = val == o.key;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: review ? null : () => onChanged(q.id, o.key),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: sel ? AppColors.primary.withValues(alpha: 0.06) : AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: sel ? AppColors.primary : AppColors.border),
                ),
                child: Row(children: [
                  Container(
                    width: 22, height: 22,
                    decoration: BoxDecoration(
                      color: sel ? AppColors.primary : Colors.transparent,
                      shape: BoxShape.circle,
                      border: Border.all(color: sel ? AppColors.primary : AppColors.border),
                    ),
                    alignment: Alignment.center,
                    child: Text(o.key, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: sel ? Colors.white : AppColors.mutedForeground)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(child: Text(o.text, style: const TextStyle(fontSize: 13.5))),
                ]),
              ),
            ),
          );
        }).toList(),
      );
    }
    if (_selectTypes.contains(group.type)) {
      return SizedBox(
        width: 240,
        child: DropdownButtonFormField<String>(
          initialValue: val.isEmpty ? null : val,
          isExpanded: true,
          decoration: const InputDecoration(hintText: 'Choose…', contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
          items: (group.sharedOptions ?? []).map((o) {
            final t = o.text.length > 34 ? '${o.text.substring(0, 34)}…' : o.text;
            return DropdownMenuItem(value: o.key, child: Text('${o.key} — $t', overflow: TextOverflow.ellipsis));
          }).toList(),
          onChanged: review ? null : (v) => onChanged(q.id, v ?? ''),
        ),
      );
    }
    if (_textTypes.contains(group.type)) {
      return SizedBox(
        width: 240,
        child: TextFormField(
          initialValue: val,
          enabled: !review,
          decoration: const InputDecoration(hintText: 'Type your answer', contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
          onChanged: (v) => onChanged(q.id, v),
        ),
      );
    }
    return const SizedBox.shrink();
  }

  Widget _pill(String text, String key, String val, String qid) {
    final sel = val == key;
    return GestureDetector(
      onTap: review ? null : () => onChanged(qid, key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: sel ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: sel ? AppColors.primary : AppColors.border),
        ),
        child: Text(text, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: sel ? Colors.white : AppColors.foreground)),
      ),
    );
  }
}
