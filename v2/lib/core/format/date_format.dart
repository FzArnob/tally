import 'package:intl/intl.dart';

/// Full timestamp used in history lists, matching v1's `formatTimeFull`
/// (short month, numeric day/year, 2-digit time). Locale-aware so Bengali
/// renders Bengali numerals and month names.
String formatTimestamp(DateTime date, String localeName) {
  return DateFormat('MMM d, y, hh:mm:ss a', localeName).format(date);
}
