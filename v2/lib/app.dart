import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:tally/core/locale/locale_controller.dart';
import 'package:tally/core/theme/app_theme.dart';
import 'package:tally/l10n/app_localizations.dart';
import 'package:tally/router/app_router.dart';

class TallyApp extends ConsumerWidget {
  const TallyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeControllerProvider);

    return MaterialApp.router(
      title: 'Tally',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      locale: locale,
      supportedLocales: AppL10n.supportedLocales,
      localizationsDelegates: AppL10n.localizationsDelegates,
      routerConfig: router,
    );
  }
}
