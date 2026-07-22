import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import 'package:tally/core/theme/tokens.dart';

/// Renders a product image. v1 stores the picked image as an inline base64
/// data URL in `image_url`; this also tolerates plain http(s) URLs and falls
/// back to an inventory icon.
class ProductThumb extends StatelessWidget {
  const ProductThumb({
    super.key,
    required this.imageUrl,
    this.size = 44,
    this.radius = 10,
    this.iconSize,
  });

  final String? imageUrl;
  final double size;
  final double radius;
  final double? iconSize;

  @override
  Widget build(BuildContext context) {
    final bytes = _decodeDataUrl(imageUrl);
    final borderRadius = BorderRadius.circular(radius);

    Widget child;
    if (bytes != null) {
      child = Image.memory(bytes, fit: BoxFit.cover, gaplessPlayback: true);
    } else if (imageUrl != null &&
        (imageUrl!.startsWith('http://') || imageUrl!.startsWith('https://'))) {
      child = Image.network(
        imageUrl!,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _fallback(context),
      );
    } else {
      child = _fallback(context);
    }

    return ClipRRect(
      borderRadius: borderRadius,
      child: SizedBox(width: size, height: size, child: child),
    );
  }

  Widget _fallback(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      alignment: Alignment.center,
      child: Icon(
        Icons.inventory_2_outlined,
        size: iconSize ?? size * 0.55,
        color: context.tally.mutedForeground,
      ),
    );
  }

  static Uint8List? _decodeDataUrl(String? url) {
    if (url == null || !url.startsWith('data:')) return null;
    final comma = url.indexOf(',');
    if (comma == -1) return null;
    try {
      return base64Decode(url.substring(comma + 1));
    } catch (_) {
      return null;
    }
  }
}
