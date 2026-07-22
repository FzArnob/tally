/// Static application configuration.
///
/// The API base URL is injected at build/run time via `--dart-define`:
///
/// ```
/// flutter run --dart-define=API_BASE_URL=http://localhost/tally/api/
/// ```
///
/// It defaults to the local XAMPP install. See `BUILD.md` for how to reach the
/// backend from a real device (adb reverse / LAN IP).
class AppConfig {
  const AppConfig._();

  /// Base URL of the PHP API. Must end with a trailing slash.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost/tally/api/',
  );

  /// The app is scoped to a single "book" (store), matching the v1 web client
  /// which hardcodes book_id = 1 (the seeded "Samad's Store").
  static const int bookId = 1;

  /// Duration used to distinguish a long-press (open history) from a tap.
  static const Duration longPress = Duration(milliseconds: 500);
}
