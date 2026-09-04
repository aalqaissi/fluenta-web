import 'package:flutter/material.dart';
import '../../config/brand.dart';
import '../../mock/data.dart';
import '../../theme/app_colors.dart';
import '../../utils/format.dart';
import '../../widgets/ui.dart';

class CertificatesScreen extends StatelessWidget {
  const CertificatesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Certificates')),
      body: certificates.isEmpty
          ? const Padding(
              padding: EdgeInsets.all(24),
              child: EmptyStateView(icon: Icons.workspace_premium_outlined, title: 'No certificates yet', description: 'Complete a course or reach a band milestone to earn one.'),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                const Text('Shareable proof of the milestones you\'ve completed.', style: TextStyle(color: AppColors.mutedForeground)),
                const SizedBox(height: 14),
                ...certificates.map((c) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: FluentaCard(
                        padding: EdgeInsets.zero,
                        child: Column(children: [
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(colors: [
                                AppColors.primary.withValues(alpha: 0.1),
                                AppColors.secondary.withValues(alpha: 0.1),
                              ]),
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                            ),
                            child: Column(children: [
                              Container(
                                width: 48, height: 48,
                                decoration: BoxDecoration(gradient: AppColors.warmGradient, borderRadius: BorderRadius.circular(16)),
                                child: const Icon(Icons.verified_rounded, color: Colors.white),
                              ),
                              const SizedBox(height: 8),
                              const Text('CERTIFICATE OF ACHIEVEMENT', style: TextStyle(fontSize: 10.5, letterSpacing: 1.5, fontWeight: FontWeight.w800, color: AppColors.mutedForeground)),
                              const SizedBox(height: 4),
                              Text(c.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800), textAlign: TextAlign.center),
                              Text('Awarded by ${Brand.name}', style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                              const SizedBox(height: 6),
                              PillBadge('Band ${formatBand(c.band)}', color: AppColors.success),
                            ]),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                              Text('Issued ${c.issuedOn}', style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
                              Row(children: [
                                OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(minimumSize: const Size(0, 38), padding: const EdgeInsets.symmetric(horizontal: 10)),
                                  onPressed: () => showToast(context, 'Shared link copied', description: c.title),
                                  icon: const Icon(Icons.ios_share_rounded, size: 16),
                                  label: const Text('Share'),
                                ),
                                const SizedBox(width: 8),
                                FilledButton.icon(
                                  style: FilledButton.styleFrom(minimumSize: const Size(0, 38), padding: const EdgeInsets.symmetric(horizontal: 12)),
                                  onPressed: () => showToast(context, 'Downloading…', description: '${c.title}.pdf'),
                                  icon: const Icon(Icons.download_rounded, size: 16),
                                  label: const Text('Download'),
                                ),
                              ]),
                            ]),
                          ),
                        ]),
                      ),
                    )),
              ],
            ),
    );
  }
}
