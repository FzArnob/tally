import 'package:flutter/material.dart';

import 'package:tally/core/theme/tokens.dart';

/// Builds the light and dark [ThemeData] from the v1 design tokens.
class AppTheme {
  const AppTheme._();

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;

    final background = isDark ? TallyTokens.darkBackground : TallyTokens.lightBackground;
    final foreground = isDark ? TallyTokens.darkForeground : TallyTokens.lightForeground;
    final primary = isDark ? TallyTokens.darkPrimary : TallyTokens.lightPrimary;
    final primaryFg = isDark ? TallyTokens.darkPrimaryFg : TallyTokens.lightPrimaryFg;
    final secondary = isDark ? TallyTokens.darkSecondary : TallyTokens.lightSecondary;
    final muted = isDark ? TallyTokens.darkMuted : TallyTokens.lightMuted;
    final mutedFg = isDark ? TallyTokens.darkMutedFg : TallyTokens.lightMutedFg;
    final border = isDark ? TallyTokens.darkBorder : TallyTokens.lightBorder;
    final inputBg = isDark ? TallyTokens.darkInputBg : TallyTokens.lightInputBg;

    final scheme = ColorScheme(
      brightness: brightness,
      primary: primary,
      onPrimary: primaryFg,
      secondary: secondary,
      onSecondary: foreground,
      error: TallyTokens.red,
      onError: Colors.white,
      surface: background,
      onSurface: foreground,
      surfaceContainerHighest: muted,
      surfaceContainerHigh: isDark ? TallyTokens.darkMuted : TallyTokens.lightMuted,
      outline: isDark ? TallyTokens.darkBorder : const Color(0x33000000),
      outlineVariant: border,
    );

    final tallyColors = isDark ? TallyColors.dark : TallyColors.light;

    final base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      splashFactory: InkSparkle.splashFactory,
      // v1 uses the platform system font stack; leaving fontFamily null lets
      // each platform use its default (San Francisco / Segoe UI / Roboto).
    );

    return base.copyWith(
      extensions: [tallyColors],
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        surfaceTintColor: Colors.transparent,
        foregroundColor: foreground,
        elevation: 0,
        centerTitle: false,
      ),
      dividerTheme: DividerThemeData(color: border, thickness: 1, space: 1),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: inputBg,
        hintStyle: TextStyle(color: mutedFg),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: TallyTokens.cardRadius,
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: TallyTokens.cardRadius,
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: TallyTokens.cardRadius,
          borderSide: BorderSide(color: scheme.primary.withValues(alpha: 0.5)),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: primaryFg,
          minimumSize: const Size(0, 48),
          shape: const RoundedRectangleBorder(borderRadius: TallyTokens.cardRadius),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: foreground,
          minimumSize: const Size(0, 48),
          side: BorderSide(color: border),
          shape: const RoundedRectangleBorder(borderRadius: TallyTokens.cardRadius),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: foreground),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(foregroundColor: foreground),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: background,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(TallyTokens.radiusLg)),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: muted,
        side: BorderSide(color: border),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: isDark ? TallyTokens.darkSecondary : TallyTokens.lightForeground,
        contentTextStyle: TextStyle(
          color: isDark ? TallyTokens.darkForeground : Colors.white,
        ),
      ),
    );
  }
}
