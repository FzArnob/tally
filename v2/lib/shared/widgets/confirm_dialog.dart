import 'package:flutter/material.dart';

import 'package:tally/core/theme/tokens.dart';
import 'package:tally/l10n/app_localizations.dart';

/// A destructive confirmation dialog. Returns `true` when confirmed.
Future<bool> showDeleteConfirm(
  BuildContext context, {
  required String title,
  required String message,
}) async {
  final l10n = AppL10n.of(context);
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: Text(l10n.cancel),
        ),
        FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: TallyTokens.red,
            foregroundColor: Colors.white,
          ),
          onPressed: () => Navigator.of(ctx).pop(true),
          child: Text(l10n.delete),
        ),
      ],
    ),
  );
  return result ?? false;
}
