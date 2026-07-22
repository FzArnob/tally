import 'package:flutter/material.dart';

/// Design tokens ported from `v1/styles.css` `:root` variables so the Flutter
/// app keeps the same visual identity while rendering with Material 3.
class TallyTokens {
  const TallyTokens._();

  // Brand accents (identical in light and dark in v1).
  static const Color green = Color(0xFF00B97B); // paid / sale / positive
  static const Color red = Color(0xFFE62737); // unpaid / destructive / negative
  static const Color redHover = Color(0xFFC81F2D);
  static const Color orange = Color(0xFFFCA103); // stock-in accent
  static const Color calcOrange = Color(0xFFEB8634); // AC / + keys in v1

  // Light palette.
  static const Color lightBackground = Color(0xFFFFFFFF);
  static const Color lightForeground = Color(0xFF1A1A1A);
  static const Color lightPrimary = Color(0xFF030213);
  static const Color lightPrimaryFg = Color(0xFFFFFFFF);
  static const Color lightSecondary = Color(0xFFF1F1F1);
  static const Color lightMuted = Color(0xFFECECF0);
  static const Color lightMutedFg = Color(0xFF717182);
  static const Color lightAccent = Color(0xFFE9EBEF);
  static const Color lightBorder = Color(0x1A000000); // rgba(0,0,0,.1)
  static const Color lightInputBg = Color(0xFFF3F3F5);

  // Dark palette.
  static const Color darkBackground = Color(0xFF1A1A1A);
  static const Color darkForeground = Color(0xFFFFFFFF);
  static const Color darkPrimary = Color(0xFFFFFFFF);
  static const Color darkPrimaryFg = Color(0xFF1A1A1A);
  static const Color darkSecondary = Color(0xFF404040);
  static const Color darkMuted = Color(0xFF303030);
  static const Color darkMutedFg = Color(0xFFA1A1AA);
  static const Color darkAccent = Color(0xFF686868);
  static const Color darkBorder = Color(0xFF686868);
  static const Color darkInputBg = Color(0xFF252525);

  // Shape.
  static const double radius = 10; // 0.625rem
  static const double radiusLg = 20; // 1.25rem bottom-sheet corners
  static const BorderRadius cardRadius = BorderRadius.all(Radius.circular(radius));
}

/// Extra semantic colors that don't fit Material's [ColorScheme], exposed via a
/// [ThemeExtension] so widgets can read them from the theme (and they animate
/// correctly across light/dark).
@immutable
class TallyColors extends ThemeExtension<TallyColors> {
  const TallyColors({
    required this.positive,
    required this.negative,
    required this.stock,
    required this.sale,
    required this.mutedForeground,
    required this.inputBackground,
  });

  final Color positive;
  final Color negative;
  final Color stock;
  final Color sale;
  final Color mutedForeground;
  final Color inputBackground;

  static const light = TallyColors(
    positive: TallyTokens.green,
    negative: TallyTokens.red,
    stock: TallyTokens.orange,
    sale: TallyTokens.green,
    mutedForeground: TallyTokens.lightMutedFg,
    inputBackground: TallyTokens.lightInputBg,
  );

  static const dark = TallyColors(
    positive: TallyTokens.green,
    negative: TallyTokens.red,
    stock: TallyTokens.orange,
    sale: TallyTokens.green,
    mutedForeground: TallyTokens.darkMutedFg,
    inputBackground: TallyTokens.darkInputBg,
  );

  @override
  TallyColors copyWith({
    Color? positive,
    Color? negative,
    Color? stock,
    Color? sale,
    Color? mutedForeground,
    Color? inputBackground,
  }) {
    return TallyColors(
      positive: positive ?? this.positive,
      negative: negative ?? this.negative,
      stock: stock ?? this.stock,
      sale: sale ?? this.sale,
      mutedForeground: mutedForeground ?? this.mutedForeground,
      inputBackground: inputBackground ?? this.inputBackground,
    );
  }

  @override
  TallyColors lerp(TallyColors? other, double t) {
    if (other == null) return this;
    return TallyColors(
      positive: Color.lerp(positive, other.positive, t)!,
      negative: Color.lerp(negative, other.negative, t)!,
      stock: Color.lerp(stock, other.stock, t)!,
      sale: Color.lerp(sale, other.sale, t)!,
      mutedForeground: Color.lerp(mutedForeground, other.mutedForeground, t)!,
      inputBackground: Color.lerp(inputBackground, other.inputBackground, t)!,
    );
  }
}

/// Convenience access to [TallyColors] from a [BuildContext].
extension TallyColorsX on BuildContext {
  TallyColors get tally => Theme.of(this).extension<TallyColors>()!;
}
