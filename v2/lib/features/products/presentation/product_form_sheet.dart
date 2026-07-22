import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import 'package:tally/core/responsive/breakpoints.dart';
import 'package:tally/core/theme/tokens.dart';
import 'package:tally/l10n/app_localizations.dart';
import 'package:tally/shared/widgets/error_snackbar.dart';
import 'package:tally/shared/widgets/product_thumb.dart';
import 'package:tally/shared/widgets/sheet_header.dart';
import 'package:tally/features/products/application/products_providers.dart';
import 'package:tally/features/products/domain/product.dart';

const _knownTypes = ['piece', 'packet', 'cartoon', 'kg', 'liter'];

/// Opens the add/edit product form. Returns `true` when a product was saved.
Future<bool?> showProductForm(BuildContext context, {Product? product}) {
  return showAdaptiveSheetOrDialog<bool>(
    context: context,
    builder: (_) => ProductFormSheet(product: product),
  );
}

class ProductFormSheet extends ConsumerStatefulWidget {
  const ProductFormSheet({super.key, this.product});

  final Product? product;

  @override
  ConsumerState<ProductFormSheet> createState() => _ProductFormSheetState();
}

class _ProductFormSheetState extends ConsumerState<ProductFormSheet> {
  final _nameCtrl = TextEditingController();
  final _customCtrl = TextEditingController();
  String _type = 'piece';
  bool _custom = false;
  String? _imageDataUrl;
  bool _saving = false;

  bool get _isEdit => widget.product != null;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    if (p != null) {
      _nameCtrl.text = p.name;
      _imageDataUrl = p.imageUrl;
      if (_knownTypes.contains(p.quantityType)) {
        _type = p.quantityType;
      } else {
        _type = 'custom';
        _custom = true;
        _customCtrl.text = p.quantityType;
      }
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _customCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      imageQuality: 80,
    );
    if (file == null) return;
    final bytes = await file.readAsBytes();
    final mime = file.mimeType ?? _guessMime(file.name);
    setState(() => _imageDataUrl = 'data:$mime;base64,${base64Encode(bytes)}');
  }

  String _guessMime(String name) {
    final n = name.toLowerCase();
    if (n.endsWith('.png')) return 'image/png';
    if (n.endsWith('.gif')) return 'image/gif';
    if (n.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  Future<void> _save() async {
    final l10n = AppL10n.of(context);
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      showMessageSnack(context, l10n.enterProductName);
      return;
    }
    var quantityType = _type;
    if (_type == 'custom') {
      quantityType = _customCtrl.text.trim();
      if (quantityType.isEmpty) {
        showMessageSnack(context, l10n.enterQuantityType);
        return;
      }
    }

    setState(() => _saving = true);
    try {
      await ref.read(productsProvider.notifier).saveProduct(
            productId: widget.product?.id,
            name: name,
            quantityType: quantityType,
            imageUrl: _imageDataUrl,
          );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        showErrorSnack(context, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);
    final muted = context.tally.mutedForeground;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 8, 0),
          child: SheetHeader(title: _isEdit ? l10n.editProduct : l10n.addProduct),
        ),
        Flexible(
          child: SheetBody(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(l10n.productImage, style: TextStyle(color: muted)),
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: InkWell(
                    onTap: _pickImage,
                    borderRadius: BorderRadius.circular(14),
                    child: _imageDataUrl != null
                        ? ProductThumb(imageUrl: _imageDataUrl, size: 80, radius: 14)
                        : Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              color: context.tally.inputBackground,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                  color: Theme.of(context).dividerColor),
                            ),
                            child: Icon(Icons.add_photo_alternate_outlined,
                                color: muted, size: 28),
                          ),
                  ),
                ),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(l10n.productName, style: TextStyle(color: muted)),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _nameCtrl,
                  textInputAction: TextInputAction.done,
                  decoration: InputDecoration(hintText: l10n.productNameHint),
                ),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(l10n.quantityType, style: TextStyle(color: muted)),
                ),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: _type,
                  items: [
                    DropdownMenuItem(value: 'piece', child: Text(l10n.unitPiece)),
                    DropdownMenuItem(value: 'packet', child: Text(l10n.unitPacket)),
                    DropdownMenuItem(value: 'cartoon', child: Text(l10n.unitCartoon)),
                    DropdownMenuItem(value: 'kg', child: Text(l10n.unitKg)),
                    DropdownMenuItem(value: 'liter', child: Text(l10n.unitLiter)),
                    DropdownMenuItem(value: 'custom', child: Text(l10n.unitCustom)),
                  ],
                  onChanged: (v) => setState(() {
                    _type = v ?? 'piece';
                    _custom = _type == 'custom';
                  }),
                ),
                if (_custom) ...[
                  const SizedBox(height: 8),
                  TextField(
                    controller: _customCtrl,
                    decoration: InputDecoration(hintText: l10n.customUnitHint),
                  ),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(_isEdit ? l10n.saveChanges : l10n.addProduct),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
