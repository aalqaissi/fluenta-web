import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../widgets/modals.dart';
import '../../widgets/ui.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final user = app.user;

    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          // profile card
          FluentaCard(
            child: Row(children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: AppColors.primary,
                child: Text(user.initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(user.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  Text(user.email, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                  const SizedBox(height: 4),
                  PillBadge(app.isPro ? user.planLabel : 'Free', color: app.isPro ? AppColors.success : AppColors.mutedForeground),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: 16),

          _tile(context, Icons.library_books_outlined, 'Lessons & Library', () => context.push('/lessons')),
          _tile(context, Icons.emoji_events_outlined, 'Achievements', () => context.push('/achievements')),
          _tile(context, Icons.workspace_premium_outlined, 'Certificates', () => context.push('/certificates')),
          _tile(context, Icons.credit_card_outlined, app.isPro ? 'Manage plan' : 'Upgrade to Pro', () => context.push('/checkout')),
          _tile(context, Icons.settings_outlined, 'Account & privacy', () => context.push('/settings')),
          _tile(context, Icons.help_outline_rounded, 'Help & support', () => context.push('/help')),
          _tile(context, Icons.forum_outlined, 'Give feedback', () => showFeedbackSheet(context)),

          const SizedBox(height: 16),
          // demo toggle
          FluentaCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Icon(Icons.visibility_outlined, size: 20, color: AppColors.mutedForeground),
                const SizedBox(width: 12),
                const Expanded(child: Text('Preview free tier', style: TextStyle(fontWeight: FontWeight.w700))),
                Switch(value: app.previewFree, onChanged: app.setPreviewFree),
              ]),
              const SizedBox(height: 4),
              const Text('Demo toggle — shows the locked/upsell state a free account sees. Features stay usable.',
                  style: TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
            ]),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(foregroundColor: AppColors.destructive, side: const BorderSide(color: Color(0x66DC2626))),
            onPressed: () => context.go('/login'),
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign out'),
          ),
        ],
      ),
    );
  }

  Widget _tile(BuildContext context, IconData icon, String label, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: FluentaCard(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        onTap: onTap,
        child: Row(children: [
          Icon(icon, color: AppColors.foreground, size: 22),
          const SizedBox(width: 14),
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700))),
          const Icon(Icons.chevron_right_rounded, color: AppColors.mutedForeground),
        ]),
      ),
    );
  }
}
