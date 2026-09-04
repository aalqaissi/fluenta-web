import 'package:flutter/material.dart';
import '../../mock/data.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  String _selected = 'trial';

  @override
  Widget build(BuildContext context) {
    final plan = plans.firstWhere((p) => p.id == _selected);
    return Scaffold(
      appBar: AppBar(title: const Text('Subscription')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          const Text('Complete your subscription', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
          const Text('Join thousands of students achieving their IELTS goals.', style: TextStyle(color: AppColors.mutedForeground)),
          const SizedBox(height: 16),
          ...plans.map((p) {
            final sel = _selected == p.id;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => setState(() => _selected = p.id),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    color: sel ? AppColors.primary.withValues(alpha: 0.05) : AppColors.surface,
                    border: Border.all(color: sel ? AppColors.primary : AppColors.border, width: sel ? 1.5 : 1),
                  ),
                  child: Row(children: [
                    Icon(sel ? Icons.radio_button_checked_rounded : Icons.radio_button_unchecked_rounded,
                        color: sel ? AppColors.primary : AppColors.border),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Text(p.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                          if (p.badge != null) ...[const SizedBox(width: 6), PillBadge(p.badge!, color: p.highlight ? AppColors.primary : AppColors.mutedForeground)],
                        ]),
                        Text(p.detail, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                      ]),
                    ),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text(p.price, style: const TextStyle(fontWeight: FontWeight.w800)),
                      Text(p.cadence, style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                    ]),
                  ]),
                ),
              ),
            );
          }),
          const SizedBox(height: 8),
          FluentaCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('Pay today', style: TextStyle(color: AppColors.mutedForeground)),
                Text(plan.id == 'starter' ? '\$0.00' : plan.price, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
              ]),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.secondary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                child: Text(plan.detail, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => showToast(context, 'Subscription started (demo)', description: 'No real charge in this prototype.'),
                  child: Text(plan.id == 'trial' ? 'Start trial – Pay \$4.99 today' : 'Subscribe – ${plan.price}'),
                ),
              ),
              const SizedBox(height: 6),
              const Center(child: Text('Cancel anytime. No charge in this prototype.', style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground))),
            ]),
          ),
          const SizedBox(height: 12),
          FluentaCard(
            color: AppColors.success.withValues(alpha: 0.06),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Row(children: [
                Icon(Icons.chat_bubble_outline_rounded, color: AppColors.success, size: 18),
                SizedBox(width: 6),
                Text('Support team', style: TextStyle(fontWeight: FontWeight.w800)),
              ]),
              const SizedBox(height: 6),
              const Text('Need help? Our support team handles all payment issues through one channel only: WhatsApp.',
                  style: TextStyle(color: AppColors.mutedForeground, fontSize: 13)),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.success),
                  onPressed: () => showToast(context, 'Opening WhatsApp…'),
                  icon: const Icon(Icons.chat_rounded, size: 18),
                  label: const Text('Chat on WhatsApp'),
                ),
              ),
            ]),
          ),
          const SizedBox(height: 12),
          FluentaCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('What you\'ll get', style: TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              ...planIncludes.map((f) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(children: [
                      const Icon(Icons.check_circle_rounded, size: 18, color: AppColors.success),
                      const SizedBox(width: 8),
                      Expanded(child: Text(f, style: const TextStyle(fontSize: 13.5))),
                    ]),
                  )),
            ]),
          ),
        ],
      ),
    );
  }
}
