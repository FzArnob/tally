import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:tally/core/config/app_config.dart';
import 'package:tally/core/network/api_exception.dart';

/// Thin wrapper over [Dio] that centralises the conventions of the Tally PHP
/// API: JSON bodies (including on DELETE), open CORS, and the
/// `{"error": "..."}` error envelope returned with non-2xx status codes.
class ApiClient {
  ApiClient(this._dio);

  final Dio _dio;

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) {
    return _send(() => _dio.get<dynamic>(path, queryParameters: query));
  }

  Future<Map<String, dynamic>> post(String path, Object body) {
    return _send(() => _dio.post<dynamic>(path, data: body));
  }

  /// The Tally DELETE endpoints read the id from a JSON request body, so we
  /// must send [body] rather than encoding it in the URL.
  Future<Map<String, dynamic>> delete(String path, Object body) {
    return _send(() => _dio.delete<dynamic>(path, data: body));
  }

  Future<Map<String, dynamic>> _send(
    Future<Response<dynamic>> Function() request,
  ) async {
    late final Response<dynamic> res;
    try {
      res = await request();
    } on DioException catch (e) {
      // Surface the server's error message when present, else a network error.
      final data = e.response?.data;
      final message = _extractError(data) ??
          'Network error. Check that the API server is reachable at '
              '${AppConfig.apiBaseUrl}.';
      throw ApiException(message, statusCode: e.response?.statusCode);
    }

    final data = res.data;
    final map = data is Map<String, dynamic>
        ? data
        : <String, dynamic>{'_raw': data};

    final error = _extractError(map);
    if (error != null) {
      throw ApiException(error, statusCode: res.statusCode);
    }
    if (res.statusCode != null && res.statusCode! >= 400) {
      throw ApiException('Request failed (${res.statusCode}).',
          statusCode: res.statusCode);
    }
    return map;
  }

  String? _extractError(Object? data) {
    if (data is Map && data['error'] != null) {
      return data['error'].toString();
    }
    return null;
  }
}

/// Configured [Dio] instance. `validateStatus` accepts every code so we can
/// read the JSON error envelope ourselves instead of Dio throwing first.
final dioProvider = Provider<Dio>((ref) {
  return Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      contentType: 'application/json',
      responseType: ResponseType.json,
      validateStatus: (_) => true,
    ),
  );
});

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(dioProvider));
});
