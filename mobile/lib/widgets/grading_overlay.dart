import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../services/mock_api.dart';

/// Shows a non-dismissible AI-grading dialog that animates to 100% then closes.
Future<void> showGradingDialog(BuildContext context) async {
  await showDialog<void>(
    context: context,
    barrierDismissible: false,
    barrierColor: AppColors.foreground.withValues(alpha: 0.45),
    builder: (_) => const _GradingDialog(),
  );
}

class _GradingDialog extends StatefulWidget {
  const _GradingDialog();
  @override
  State<_GradingDialog> createState() => _GradingDialogState();
}

class _GradingDialogState extends State<_GradingDialog> {
  int _pct = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    const total = 3200;
    const ticks = 40;
    var i = 0;
    _timer = Timer.periodic(const Duration(milliseconds: total ~/ ticks), (t) {
      i++;
      setState(() => _pct = ((i / ticks) * 100).round());
      if (i >= ticks) {
        t.cancel();
        Future.delayed(const Duration(milliseconds: 400), () {
          if (mounted) Navigator.of(context).pop();
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String get _label {
    for (final s in gradingSteps.reversed) {
      if (_pct >= s.atProgress) return s.label;
    }
    return gradingSteps.first.label;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64, height: 64,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [
                    AppColors.primary.withValues(alpha: 0.15),
                    AppColors.secondary.withValues(alpha: 0.15),
                  ]),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(Icons.psychology_rounded, color: AppColors.primary, size: 32),
              ),
              const SizedBox(height: 12),
              const Text('AI is grading your work',
                  style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
              const SizedBox(height: 2),
              Text(_label, style: const TextStyle(color: AppColors.mutedForeground)),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Progress', style: TextStyle(color: AppColors.mutedForeground, fontWeight: FontWeight.w600, fontSize: 12)),
                  Text('$_pct%', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(value: _pct / 100, minHeight: 8),
              ),
              const SizedBox(height: 16),
              ...gradingSteps.map((s) {
                final active = _pct >= s.atProgress;
                final current = _label == s.label && _pct < 100;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Container(
                        width: 20, height: 20,
                        decoration: BoxDecoration(
                          color: active ? AppColors.success : AppColors.muted,
                          shape: BoxShape.circle,
                        ),
                        child: active
                            ? const Icon(Icons.check, size: 12, color: Colors.white)
                            : current
                                ? const Padding(
                                    padding: EdgeInsets.all(4),
                                    child: CircularProgressIndicator(strokeWidth: 2))
                                : null,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(s.label,
                            style: TextStyle(
                              fontSize: 13.5,
                              color: active ? AppColors.foreground : AppColors.mutedForeground,
                              fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                            )),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 4),
              const Text('This usually takes 15–30 seconds. Please don\'t close this window.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
            ],
          ),
        ),
      ),
    );
  }
}
