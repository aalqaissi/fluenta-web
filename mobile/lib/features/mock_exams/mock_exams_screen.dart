import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../mock/data.dart';
import '../../models/models.dart';
import '../../theme/app_colors.dart';
import '../../widgets/modals.dart';
import '../../widgets/ui.dart';

class MockExamsScreen extends StatefulWidget {
  const MockExamsScreen({super.key});
  @override
  State<MockExamsScreen> createState() => _MockExamsScreenState();
}

class _MockExamsScreenState extends State<MockExamsScreen> {
  final List<MockExamCard> _items = List.of(mockExams);
  int _part = 0; // 0 = all
  QuestionType? _type;

  @override
  Widget build(BuildContext context) {
    final filtered = _items.where((e) => (_part == 0 || e.part == _part) && (_type == null || e.primaryType == _type)).toList();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mock exams'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilledButton.icon(
              style: FilledButton.styleFrom(minimumSize: const Size(0, 40), padding: const EdgeInsets.symmetric(horizontal: 12)),
              onPressed: _uploadSheet,
              icon: const Icon(Icons.upload_rounded, size: 16),
              label: const Text('Upload'),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          const Text('Upload, manage, and take your own mock exams.', style: TextStyle(color: AppColors.mutedForeground)),
          const SizedBox(height: 12),
          SizedBox(
            height: 38,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                for (final p in const [(0, 'Mock Test'), (1, 'Part 1'), (2, 'Part 2'), (3, 'Part 3')])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(p.$2),
                      selected: _part == p.$1,
                      onSelected: (_) => setState(() => _part = p.$1),
                      selectedColor: AppColors.primary.withValues(alpha: 0.12),
                      labelStyle: TextStyle(fontWeight: FontWeight.w700, color: _part == p.$1 ? AppColors.primary : AppColors.mutedForeground),
                      shape: StadiumBorder(side: BorderSide(color: _part == p.$1 ? AppColors.primary : AppColors.border)),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<QuestionType?>(
            initialValue: _type,
            isExpanded: true,
            decoration: const InputDecoration(prefixIcon: Icon(Icons.filter_list_rounded)),
            hint: const Text('All types'),
            items: [
              const DropdownMenuItem<QuestionType?>(value: null, child: Text('All types')),
              ...QuestionType.values.map((t) => DropdownMenuItem(value: t, child: Text(t.label))),
            ],
            onChanged: (v) => setState(() => _type = v),
          ),
          const SizedBox(height: 12),
          Text('${filtered.length} of ${_items.length} exams ready to take', style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
          const SizedBox(height: 12),
          // upload card
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: _uploadSheet,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.muted.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border, width: 1.5),
              ),
              child: Row(children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14)),
                  child: const Icon(Icons.add_rounded, color: AppColors.primary),
                ),
                const SizedBox(width: 14),
                const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Upload reading mock', style: TextStyle(fontWeight: FontWeight.w800)),
                  Text('Create a new exam', style: TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                ]),
              ]),
            ),
          ),
          const SizedBox(height: 12),
          ...filtered.map((e) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: FluentaCard(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      PillBadge(e.isGlobal ? 'Global' : 'My upload',
                          color: e.isGlobal ? AppColors.mutedForeground : AppColors.info,
                          icon: e.isGlobal ? Icons.public_rounded : Icons.person_rounded),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        onPressed: () async {
                          final ok = await showConfirm(context,
                              title: 'Delete exam?',
                              message: 'This will permanently remove all exam data. This action cannot be undone.',
                              confirmLabel: 'Delete');
                          if (ok) {
                            setState(() => _items.remove(e));
                            if (context.mounted) showToast(context, 'Exam deleted');
                          }
                        },
                        icon: const Icon(Icons.delete_outline_rounded, size: 20, color: AppColors.mutedForeground),
                      ),
                    ]),
                    Text(e.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(e.primaryType.label, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                    const SizedBox(height: 12),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text('${e.attempts} attempts', style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                      FilledButton.icon(
                        style: FilledButton.styleFrom(minimumSize: const Size(0, 40), padding: const EdgeInsets.symmetric(horizontal: 14)),
                        onPressed: () => e.playable ? context.push('/exam/reading') : showToast(context, 'Preview exam', description: 'This sample card isn\'t wired to a full passage yet.'),
                        icon: const Icon(Icons.play_arrow_rounded, size: 18),
                        label: const Text('Take exam'),
                      ),
                    ]),
                  ]),
                ),
              )),
        ],
      ),
    );
  }

  void _uploadSheet() {
    final title = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Upload a reading mock', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const Text('Paste a passage or upload a file — we\'ll turn it into a practice exam.',
                style: TextStyle(color: AppColors.mutedForeground)),
            const SizedBox(height: 16),
            const Text('Exam title', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            TextField(controller: title, decoration: const InputDecoration(hintText: 'e.g. The History of Tea')),
            const SizedBox(height: 14),
            InkWell(
              onTap: () => showToast(context, 'File selected (demo)'),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.muted.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border, width: 1.5),
                ),
                child: const Column(children: [
                  Icon(Icons.cloud_upload_outlined, color: AppColors.mutedForeground, size: 30),
                  SizedBox(height: 6),
                  Text('Drop a PDF/DOCX or tap to browse', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  Text('Demo — file handling is simulated', style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
                ]),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  Navigator.pop(context);
                  showToast(context, 'Mock exam created', description: 'Your reading mock is ready (demo).');
                },
                child: const Text('Create exam'),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
