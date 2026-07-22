/// Thrown when the API returns an `{"error": ...}` payload or an unexpected
/// response. Carries a user-presentable [message].
class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'ApiException($statusCode): $message';
}
