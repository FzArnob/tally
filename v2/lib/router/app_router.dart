import 'package:go_router/go_router.dart';

import 'package:tally/features/home/home_page.dart';

/// App routes. The app is a single screen; sub-flows are presented as adaptive
/// sheets/dialogs rather than routes, so this stays intentionally small.
final router = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomePage(),
    ),
  ],
);
