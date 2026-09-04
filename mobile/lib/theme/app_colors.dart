import 'package:flutter/material.dart';

/// Warm & encouraging palette (mirrors the web design tokens).
class AppColors {
  static const primary = Color(0xFFEF6C57); // warm coral
  static const primaryStrong = Color(0xFFE14B34);
  static const secondary = Color(0xFFF5A524); // amber
  static const onSecondary = Color(0xFF3D2A08);
  static const success = Color(0xFF16A34A); // growth green
  static const info = Color(0xFF0EA5A4); // soft teal
  static const background = Color(0xFFFDF8F3); // warm cream
  static const surface = Color(0xFFFFFFFF);
  static const foreground = Color(0xFF292524); // warm charcoal
  static const muted = Color(0xFFF5EEE7); // warm sand
  static const mutedForeground = Color(0xFF78716C);
  static const border = Color(0xFFEBE1D6);
  static const destructive = Color(0xFFDC2626);

  static const warmGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primary, secondary],
  );

  /// Color for an IELTS band score.
  static Color bandTone(double? b) {
    if (b == null) return mutedForeground;
    if (b >= 8) return success;
    if (b >= 6.5) return info;
    if (b >= 5) return secondary;
    return primary;
  }
}
