import 'package:tally/core/network/parsing.dart';

/// A "book" is a store. The app is scoped to a single book (id 1).
class Book {
  const Book({required this.id, required this.name, this.logoUrl});

  final int id;
  final String name;
  final String? logoUrl;

  factory Book.fromJson(Map<String, dynamic> json) => Book(
        id: intFrom(json['id'], fallback: 1),
        name: stringFrom(json['name'], fallback: 'Tally'),
        logoUrl: nullableStringFrom(json['logo_url']),
      );
}
