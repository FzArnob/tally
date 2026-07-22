import 'package:flutter/material.dart';

/// Material 3 window size classes used to drive the adaptive layout.
enum WindowSize { compact, medium, expanded }

WindowSize windowSizeOf(BuildContext context) {
  final width = MediaQuery.sizeOf(context).width;
  if (width < 600) return WindowSize.compact;
  if (width < 1024) return WindowSize.medium;
  return WindowSize.expanded;
}

extension WindowSizeX on BuildContext {
  WindowSize get windowSize => windowSizeOf(this);
  bool get isCompact => windowSizeOf(this) == WindowSize.compact;
  bool get isExpanded => windowSizeOf(this) == WindowSize.expanded;
  bool get isMediumOrWider => windowSizeOf(this) != WindowSize.compact;
}

/// Presents [builder]'s content as a bottom sheet on compact screens and as a
/// centered dialog on medium/expanded screens — the same content either way.
///
/// Use for add/edit forms and history views so the app feels native on phones
/// (bottom sheets) and on tablet/desktop (dialogs).
Future<T?> showAdaptiveSheetOrDialog<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  double dialogMaxWidth = 480,
  bool isScrollControlled = true,
}) {
  if (context.isCompact) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: isScrollControlled,
      useSafeArea: true,
      builder: (ctx) => Padding(
        // Lift the sheet above the on-screen keyboard.
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
        child: builder(ctx),
      ),
    );
  }
  return showDialog<T>(
    context: context,
    builder: (ctx) => Dialog(
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: dialogMaxWidth, maxHeight: 720),
        child: builder(ctx),
      ),
    ),
  );
}
