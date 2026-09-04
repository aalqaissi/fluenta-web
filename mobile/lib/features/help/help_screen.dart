import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final faqs = [
      ('How does AI grading work?', 'After you submit, Fluenta analyses your answers and language, then returns a band estimate with specific feedback in about 15–30 seconds.'),
      ('Are the band scores official?', 'No. Fluenta gives realistic practice estimates to guide your prep. Only the official IELTS test produces certified scores.'),
      ('Can I upload my own passages?', 'Yes — go to Mock exams and use "Upload" to turn any passage into a practice exam.'),
      ('How do I cancel my subscription?', 'Manage or cancel anytime from More → Manage plan. Payment questions are handled via WhatsApp.'),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Help & support')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          FluentaCard(
            color: AppColors.success.withValues(alpha: 0.06),
            child: Row(children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.chat_rounded, color: AppColors.success),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Chat with support', style: TextStyle(fontWeight: FontWeight.w800)),
                  Text('We handle payment and account issues via WhatsApp.', style: TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: 14),
          ...faqs.map((f) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: FluentaCard(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      tilePadding: EdgeInsets.zero,
                      title: Text(f.$1, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      childrenPadding: const EdgeInsets.only(bottom: 12),
                      children: [Text(f.$2, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13.5, height: 1.4))],
                    ),
                  ),
                ),
              )),
        ],
      ),
    );
  }
}
