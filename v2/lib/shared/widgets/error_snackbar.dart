import 'package:flutter/material.dart';

import 'package:tally/core/network/api_exception.dart';

/// Shows a floating error SnackBar with the message from an [ApiException]
/// (or a generic fallback).
void showErrorSnack(BuildContext context, Object error) {
  final message =
      error is ApiException ? error.message : 'Something went wrong. Please try again.';
  showMessageSnack(context, message);
}

/// Shows a plain floating SnackBar with the given [message] (validation, etc.).
void showMessageSnack(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}
