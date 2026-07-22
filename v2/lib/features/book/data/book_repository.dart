import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:tally/core/config/app_config.dart';
import 'package:tally/core/network/api_client.dart';
import 'package:tally/features/book/domain/book.dart';

class BookRepository {
  BookRepository(this._api);

  final ApiClient _api;

  Future<Book> fetchBook({int bookId = AppConfig.bookId}) async {
    final json = await _api.get('get-book-details.php', query: {'book_id': bookId});
    return Book.fromJson(json);
  }
}

final bookRepositoryProvider = Provider<BookRepository>((ref) {
  return BookRepository(ref.watch(apiClientProvider));
});

/// Book details (store name + logo) for the header. Non-fatal: falls back to a
/// default "Tally" book if the request fails, matching v1.
final bookProvider = FutureProvider<Book>((ref) async {
  try {
    return await ref.watch(bookRepositoryProvider).fetchBook();
  } catch (_) {
    return const Book(id: AppConfig.bookId, name: 'Tally');
  }
});
