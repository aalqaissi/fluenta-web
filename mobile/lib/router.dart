import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'features/shell/app_shell.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'features/practice/practice_hub_screen.dart';
import 'features/progress/progress_screen.dart';
import 'features/coach/coach_screen.dart';
import 'features/more/more_screen.dart';
import 'features/reading/reading_hub_screen.dart';
import 'features/reading/reading_runner_screen.dart';
import 'features/reading/reading_results_screen.dart';
import 'features/writing/writing_hub_screen.dart';
import 'features/writing/writing_editor_screen.dart';
import 'features/writing/writing_results_screen.dart';
import 'features/listening/listening_screen.dart';
import 'features/speaking/speaking_screen.dart';
import 'features/full_exam/full_exam_screen.dart';
import 'features/mock_exams/mock_exams_screen.dart';
import 'features/lessons/lessons_screen.dart';
import 'features/achievements/achievements_screen.dart';
import 'features/certificates/certificates_screen.dart';
import 'features/checkout/checkout_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/help/help_screen.dart';
import 'features/auth/login_screen.dart';

final _rootKey = GlobalKey<NavigatorState>();

GoRouter buildRouter() {
  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/',
    // Any unknown/unmatched location falls back to the dashboard instead of
    // showing go_router's "page not found" screen (e.g. a hard refresh on web).
    errorBuilder: (context, state) => const _NotFoundRedirect(),
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/', builder: (c, s) => const DashboardScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/practice', builder: (c, s) => const PracticeHubScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/progress', builder: (c, s) => const ProgressScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/coach', builder: (c, s) => const CoachScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/more', builder: (c, s) => const MoreScreen())]),
        ],
      ),
      // full-screen routes (root navigator)
      GoRoute(path: '/login', builder: (c, s) => const LoginScreen()),
      GoRoute(path: '/reading', builder: (c, s) => const ReadingHubScreen()),
      GoRoute(path: '/writing', builder: (c, s) => const WritingHubScreen()),
      GoRoute(path: '/listening', builder: (c, s) => const ListeningScreen()),
      GoRoute(path: '/speaking', builder: (c, s) => const SpeakingScreen()),
      GoRoute(path: '/full-exam', builder: (c, s) => const FullExamScreen()),
      GoRoute(path: '/mock-exams', builder: (c, s) => const MockExamsScreen()),
      GoRoute(path: '/lessons', builder: (c, s) => const LessonsScreen()),
      GoRoute(path: '/achievements', builder: (c, s) => const AchievementsScreen()),
      GoRoute(path: '/certificates', builder: (c, s) => const CertificatesScreen()),
      GoRoute(path: '/checkout', builder: (c, s) => const CheckoutScreen()),
      GoRoute(path: '/settings', builder: (c, s) => const SettingsScreen()),
      GoRoute(path: '/help', builder: (c, s) => const HelpScreen()),
      GoRoute(path: '/exam/reading', builder: (c, s) => const ReadingRunnerScreen()),
      GoRoute(path: '/results/reading', builder: (c, s) => const ReadingResultsScreen()),
      GoRoute(path: '/exam/writing/:id', builder: (c, s) => WritingEditorScreen(taskId: s.pathParameters['id']!)),
      GoRoute(path: '/results/writing/:id', builder: (c, s) => const WritingResultsScreen()),
    ],
  );
}

/// Renders briefly for an unmatched route, then redirects home.
class _NotFoundRedirect extends StatefulWidget {
  const _NotFoundRedirect();
  @override
  State<_NotFoundRedirect> createState() => _NotFoundRedirectState();
}

class _NotFoundRedirectState extends State<_NotFoundRedirect> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.go('/');
    });
  }

  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: CircularProgressIndicator()));
}
