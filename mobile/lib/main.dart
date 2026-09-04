import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/brand.dart';
import 'router.dart';
import 'state/app_state.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const FluentaApp());
}

class FluentaApp extends StatelessWidget {
  const FluentaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState(),
      child: MaterialApp.router(
        title: Brand.name,
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        routerConfig: buildRouter(),
      ),
    );
  }
}
