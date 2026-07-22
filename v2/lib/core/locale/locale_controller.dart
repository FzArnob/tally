import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:tally/core/format/money.dart';

/// Persists and exposes the selected UI language (English / Bengali), mirroring
/// the v1 `selectedLanguage` cookie.
class LocaleController extends Notifier<Locale> {
  static const _key = 'selectedLanguage';
  static const supported = [Locale('en'), Locale('bn')];

  @override
  Locale build() {
    _load();
    return const Locale('en');
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_key);
    if (code != null && code != state.languageCode) {
      state = Locale(code);
    }
  }

  Future<void> setLanguage(String code) async {
    if (code == state.languageCode) return;
    state = Locale(code);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, code);
  }
}

final localeControllerProvider =
    NotifierProvider<LocaleController, Locale>(LocaleController.new);

/// [Money] formatter bound to the currently selected locale.
final moneyProvider = Provider<Money>((ref) {
  final locale = ref.watch(localeControllerProvider);
  return Money(locale.languageCode);
});
