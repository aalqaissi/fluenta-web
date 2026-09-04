import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:fluenta_mobile/features/dashboard/dashboard_screen.dart';
import 'package:fluenta_mobile/state/app_state.dart';
import 'package:fluenta_mobile/theme/app_theme.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('Dashboard renders the welcome hero', (tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => AppState(),
        child: MaterialApp(theme: buildAppTheme(), home: const DashboardScreen()),
      ),
    );
    await tester.pump();
    expect(find.textContaining('Welcome back'), findsOneWidget);
  });
}
