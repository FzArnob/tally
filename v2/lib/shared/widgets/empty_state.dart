import 'package:flutter/material.dart';

import 'package:tally/core/theme/tokens.dart';

/// Centered muted message used for empty / error states.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.message, this.icon, this.action});

  final String message;
  final IconData? icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final muted = context.tally.mutedForeground;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 40, color: muted),
              const SizedBox(height: 12),
            ],
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(color: muted),
            ),
            if (action != null) ...[const SizedBox(height: 16), action!],
          ],
        ),
      ),
    );
  }
}
