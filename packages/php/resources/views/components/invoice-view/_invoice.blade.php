{{-- Internal: strings, totals math and print CSS for the invoice view (port of web/src/components/invoice-view/invoice.ts).
     Included with @include('nasaq::components.invoice-view._invoice'); every function is defined once. --}}
@php
    if (! function_exists('nq_invoice_strings')) {
        /** The built-in words for a locale, with `$labels` laid over them. */
        function nq_invoice_strings(string $locale, array $labels = []): array
        {
            $ar = str_starts_with($locale, 'ar');

            return array_merge($ar ? [
                'invoice' => 'فاتورة', 'number' => 'رقم الفاتورة', 'issued' => 'تاريخ الإصدار', 'due' => 'تاريخ الاستحقاق', 'currency' => 'العملة',
                'from' => 'من', 'billTo' => 'الفاتورة إلى', 'taxId' => 'الرقم الضريبي', 'description' => 'الوصف', 'quantity' => 'الكمية',
                'unitPrice' => 'سعر الوحدة', 'amount' => 'المبلغ', 'subtotal' => 'المجموع الفرعي', 'discount' => 'الخصم', 'tax' => 'الضريبة',
                'total' => 'الإجمالي', 'paid' => 'المدفوع', 'amountDue' => 'المبلغ المستحق', 'payments' => 'الدفعات', 'method' => 'الطريقة',
                'date' => 'التاريخ', 'notes' => 'ملاحظات', 'terms' => 'الشروط', 'download' => 'تنزيل PDF', 'print' => 'طباعة', 'pay' => 'ادفع الآن',
                'actions' => 'إجراءات الفاتورة', 'working' => 'جارٍ التجهيز', 'downloadFailed' => 'تعذّر تجهيز الملف. حاول مرة أخرى.',
                'draft' => 'مسودة', 'open' => 'مفتوحة', 'paidStatus' => 'مدفوعة', 'overdue' => 'متأخرة', 'void' => 'ملغاة', 'refunded' => 'مستردة',
            ] : [
                'invoice' => 'Invoice', 'number' => 'Invoice number', 'issued' => 'Issued', 'due' => 'Due', 'currency' => 'Currency',
                'from' => 'From', 'billTo' => 'Billed to', 'taxId' => 'Tax number', 'description' => 'Description', 'quantity' => 'Qty',
                'unitPrice' => 'Unit price', 'amount' => 'Amount', 'subtotal' => 'Subtotal', 'discount' => 'Discount', 'tax' => 'Tax',
                'total' => 'Total', 'paid' => 'Paid', 'amountDue' => 'Amount due', 'payments' => 'Payments', 'method' => 'Method',
                'date' => 'Date', 'notes' => 'Notes', 'terms' => 'Terms', 'download' => 'Download PDF', 'print' => 'Print', 'pay' => 'Pay now',
                'actions' => 'Invoice actions', 'working' => 'Preparing', 'downloadFailed' => 'The file could not be prepared. Try again.',
                'draft' => 'Draft', 'open' => 'Open', 'paidStatus' => 'Paid', 'overdue' => 'Overdue', 'void' => 'Void', 'refunded' => 'Refunded',
            ], $labels);
        }
    }

    if (! function_exists('nq_invoice_compute')) {
        /**
         * Subtotal, discount, tax, total, paid and balance. The discount is spread over the lines in proportion, so tax
         * is charged on what the customer actually pays.
         *
         * @param  array  $invoice  lines (quantity, unitPrice, taxRate?), discount?, taxRate?, payments? (amount), status
         */
        function nq_invoice_compute(array $invoice): array
        {
            $r = fn ($n) => round($n * 100) / 100;
            $lines = $invoice['lines'] ?? [];
            $subtotal = $r(array_sum(array_map(fn ($l) => $l['quantity'] * $l['unitPrice'], $lines)));
            $discount = min($subtotal, $r($invoice['discount'] ?? 0));
            $factor = $subtotal > 0 ? ($subtotal - $discount) / $subtotal : 1;
            $tax = $r(array_sum(array_map(fn ($l) => $l['quantity'] * $l['unitPrice'] * $factor * ($l['taxRate'] ?? $invoice['taxRate'] ?? 0), $lines)));
            $total = $r($subtotal - $discount + $tax);
            $paid = $r(array_sum(array_map(fn ($p) => $p['amount'], $invoice['payments'] ?? [])));
            $settled = in_array($invoice['status'] ?? 'open', ['void', 'refunded', 'draft'], true);

            return ['subtotal' => $subtotal, 'discount' => $discount, 'tax' => $tax, 'total' => $total, 'paid' => $paid, 'due' => $settled ? 0 : max(0, $r($total - $paid))];
        }
    }
@endphp
