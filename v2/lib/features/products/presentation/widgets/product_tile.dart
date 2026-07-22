import 'package:flutter/material.dart';

import 'package:tally/core/format/money.dart';
import 'package:tally/core/theme/tokens.dart';
import 'package:tally/shared/widgets/product_thumb.dart';
import 'package:tally/features/products/domain/product.dart';

/// A single square product tile: image, name, and derived stock. Tap opens the
/// stock/sale action; long-press opens history.
class ProductTile extends StatelessWidget {
  const ProductTile({
    super.key,
    required this.product,
    required this.money,
    required this.onTap,
    required this.onLongPress,
  });

  final Product product;
  final Money money;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = context.tally.mutedForeground;

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: theme.dividerColor),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              ProductThumb(imageUrl: product.imageUrl, size: 44),
              const SizedBox(height: 6),
              Text(
                product.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontWeight: FontWeight.w500, fontSize: 12),
              ),
              const SizedBox(height: 2),
              Text(
                '${money.number(product.currentStock)} ${product.quantityType}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 11, color: muted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The trailing dashed "+" tile used to add a product.
class AddProductTile extends StatelessWidget {
  const AddProductTile({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final muted = context.tally.mutedForeground;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: DottedBorderBox(
        color: Theme.of(context).dividerColor,
        child: Center(child: Icon(Icons.add, size: 28, color: muted)),
      ),
    );
  }
}

/// A lightweight dashed-border container (avoids an extra dependency).
class DottedBorderBox extends StatelessWidget {
  const DottedBorderBox({super.key, required this.child, required this.color});

  final Widget child;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _DashedRRectPainter(color: color),
      child: child,
    );
  }
}

class _DashedRRectPainter extends CustomPainter {
  _DashedRRectPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    final rrect = RRect.fromRectAndRadius(
      Offset.zero & size,
      const Radius.circular(16),
    );
    final path = Path()..addRRect(rrect);
    const dash = 5.0;
    const gap = 4.0;
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        canvas.drawPath(
          metric.extractPath(distance, distance + dash),
          paint,
        );
        distance += dash + gap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedRRectPainter oldDelegate) =>
      oldDelegate.color != color;
}
