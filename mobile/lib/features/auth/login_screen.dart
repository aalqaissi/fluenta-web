import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/brand.dart';
import '../../theme/app_colors.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final perks = [
      (Icons.menu_book_rounded, 'Academic Reading with all 11 question types'),
      (Icons.edit_rounded, 'AI feedback on Writing across 4 criteria'),
      (Icons.headphones_rounded, 'Listening practice, played once like the real test'),
      (Icons.mic_rounded, 'Speaking recordings with pronunciation coaching'),
    ];
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(children: [
            // brand hero
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(24, 40, 24, 36),
              decoration: const BoxDecoration(
                gradient: AppColors.warmGradient,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(12)),
                    alignment: Alignment.center,
                    child: const Text('F', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 20)),
                  ),
                  const SizedBox(width: 10),
                  const Text(Brand.name, style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                ]),
                const SizedBox(height: 24),
                const Text(Brand.tagline, style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800, height: 1.2)),
                const SizedBox(height: 8),
                const Text(Brand.shortPitch, style: TextStyle(color: Colors.white70, height: 1.4)),
                const SizedBox(height: 20),
                ...perks.map((p) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(children: [
                        Container(
                          width: 34, height: 34,
                          decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(10)),
                          child: Icon(p.$1, color: Colors.white, size: 18),
                        ),
                        const SizedBox(width: 10),
                        Expanded(child: Text(p.$2, style: const TextStyle(color: Colors.white, fontSize: 13))),
                      ]),
                    )),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Welcome back', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                const Text('Sign in to continue your IELTS journey.', style: TextStyle(color: AppColors.mutedForeground)),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 52)),
                    onPressed: () => context.go('/'),
                    icon: const Icon(Icons.g_mobiledata_rounded, size: 30, color: Color(0xFF4285F4)),
                    label: const Text('Continue with Google'),
                  ),
                ),
                const SizedBox(height: 12),
                const Center(
                  child: Text('Prototype — "Continue with Google" drops you into the demo.',
                      textAlign: TextAlign.center, style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
                ),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}
