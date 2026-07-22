import 'package:flutter/material.dart';

/// A title row with an optional trailing action and a close button, used at the
/// top of every bottom sheet / dialog.
class SheetHeader extends StatelessWidget {
  const SheetHeader({
    super.key,
    required this.title,
    this.trailing,
    this.onClose,
  });

  final String title;
  final Widget? trailing;
  final VoidCallback? onClose;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
        if (trailing != null) trailing!,
        IconButton(
          tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
          icon: const Icon(Icons.close),
          onPressed: onClose ?? () => Navigator.of(context).maybePop(),
        ),
      ],
    );
  }
}

/// Standard padded container for sheet/dialog content that sizes to its child
/// and scrolls when tall.
class SheetBody extends StatelessWidget {
  const SheetBody({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
        child: child,
      ),
    );
  }
}
