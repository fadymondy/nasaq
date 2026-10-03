{{-- Internal: the words and pure helpers shared by the local payments components, ported from local-payments strings and payment-logic.ts.
     Included with @include('nasaq::components.local-payments._logic'); every function is defined once. {name} style placeholders are filled by nq_payments_say. --}}
@php
    if (! function_exists('nq_payments_words')) {
        /** The components' own words for a locale, with the host's overrides on top (nested keys merge). */
        function nq_payments_words(string $locale, array $override = []): array
        {
            $en = [
                'title' => 'Pay by transfer', 'description' => 'Send exactly {total}, then add your receipt so we can verify it.', 'method' => 'Payment method',
                'kinds' => ['instant-transfer' => 'Instant transfer', 'mobile-wallet' => 'Mobile wallet', 'bank-transfer' => 'Bank transfer', 'cash-deposit' => 'Cash deposit'],
                'fee' => 'Fee {fee}', 'noFee' => 'No fee', 'steps' => 'How to pay', 'details' => 'Send it to', 'copy' => 'Copy', 'amount' => 'Amount', 'feeRow' => 'Method fee',
                'total' => 'Total to send', 'scan' => 'Scan to pay', 'reference' => 'Transfer reference',
                'referenceHint' => 'The reference number shown in your banking or wallet app after the transfer.', 'receipt' => 'Receipt',
                'receiptHint' => 'A photo or PDF of the transfer. Up to 5 MB.', 'receiptDrop' => 'Drop the receipt here or browse', 'submit' => 'I have paid, send for verification',
                'cancel' => 'Cancel', 'failed' => 'That did not go through. Try again.',
                'problems' => [
                    'empty' => 'Enter the transfer reference.', 'short' => 'That reference looks too short.', 'chars' => 'Use letters, digits and dashes only.',
                    'receipt' => 'Add the receipt.', 'min' => 'This method needs at least {min}.', 'max' => 'This method allows up to {max}.', 'method' => 'Choose a payment method.',
                ],
                'empty' => 'No payment methods', 'emptyDescription' => 'Add a method to start taking payments.', 'verification' => 'Verification',
                'stages' => ['submitted' => 'Receipt sent', 'verifying' => 'Under review', 'verified' => 'Payment verified'],
                'stageHelp' => ['submitted' => 'We have your receipt.', 'verifying' => 'Someone on the team is matching it with the bank.', 'verified' => 'Your payment is confirmed.'],
                'statuses' => ['unpaid' => 'Awaiting payment', 'submitted' => 'Receipt sent', 'verifying' => 'Under review', 'verified' => 'Verified', 'rejected' => 'Rejected'],
                'submittedAt' => 'Sent', 'rejectedTitle' => 'We could not verify this payment', 'rejectedHelp' => 'Send a new receipt and we will look again.',
                'resubmit' => 'Send a new receipt', 'viaMethod' => 'Paid with {name}', 'queue' => 'Payments to verify', 'customer' => 'Customer', 'methodCol' => 'Method',
                'amountCol' => 'Amount', 'referenceCol' => 'Reference', 'sent' => 'Sent', 'statusCol' => 'Status', 'search' => 'Search payments', 'verify' => 'Verify',
                'reject' => 'Reject', 'viewReceipt' => 'View receipt', 'rejectTitle' => 'Reject this payment?', 'rejectDescription' => '{who} will be asked to send a new receipt.',
                'reason' => 'Reason', 'reasonHint' => 'Say what did not match: amount, date or reference.', 'confirmReject' => 'Reject payment', 'emptyQueue' => 'Nothing to verify',
                'emptyQueueDescription' => 'Submitted receipts will show here.', 'queueLabel' => 'Payments waiting for verification', 'close' => 'Close',
            ];
            $ar = [
                'title' => 'الدفع بالتحويل', 'description' => 'حوّل {total} بالضبط، ثم أرفق الإيصال لنتحقق منه.', 'method' => 'طريقة الدفع',
                'kinds' => ['instant-transfer' => 'تحويل فوري', 'mobile-wallet' => 'محفظة إلكترونية', 'bank-transfer' => 'تحويل بنكي', 'cash-deposit' => 'إيداع نقدي'],
                'fee' => 'الرسوم {fee}', 'noFee' => 'بدون رسوم', 'steps' => 'طريقة الدفع', 'details' => 'حوّل إلى', 'copy' => 'نسخ', 'amount' => 'المبلغ', 'feeRow' => 'رسوم الطريقة',
                'total' => 'الإجمالي المطلوب', 'scan' => 'امسح للدفع', 'reference' => 'مرجع التحويل',
                'referenceHint' => 'الرقم المرجعي الذي يظهر في تطبيق البنك أو المحفظة بعد التحويل.', 'receipt' => 'الإيصال',
                'receiptHint' => 'صورة أو ملف PDF للتحويل. حتى 5 ميجابايت.', 'receiptDrop' => 'أفلت الإيصال هنا أو تصفّح', 'submit' => 'لقد دفعت، أرسل للتحقق',
                'cancel' => 'إلغاء', 'failed' => 'لم تتم العملية. حاول مرة أخرى.',
                'problems' => [
                    'empty' => 'أدخل مرجع التحويل.', 'short' => 'المرجع يبدو قصيرًا جدًا.', 'chars' => 'استخدم الأحرف والأرقام والشرطات فقط.',
                    'receipt' => 'أرفق الإيصال.', 'min' => 'تتطلب هذه الطريقة {min} على الأقل.', 'max' => 'تسمح هذه الطريقة بحد أقصى {max}.', 'method' => 'اختر طريقة الدفع.',
                ],
                'empty' => 'لا توجد طرق دفع', 'emptyDescription' => 'أضف طريقة لبدء استقبال المدفوعات.', 'verification' => 'التحقق',
                'stages' => ['submitted' => 'أُرسل الإيصال', 'verifying' => 'قيد المراجعة', 'verified' => 'تم التحقق من الدفع'],
                'stageHelp' => ['submitted' => 'استلمنا إيصالك.', 'verifying' => 'أحد أعضاء الفريق يطابقه مع البنك.', 'verified' => 'تم تأكيد دفعتك.'],
                'statuses' => ['unpaid' => 'بانتظار الدفع', 'submitted' => 'أُرسل الإيصال', 'verifying' => 'قيد المراجعة', 'verified' => 'تم التحقق', 'rejected' => 'مرفوضة'],
                'submittedAt' => 'أُرسل', 'rejectedTitle' => 'تعذّر التحقق من هذه الدفعة', 'rejectedHelp' => 'أرسل إيصالًا جديدًا وسننظر فيه مرة أخرى.',
                'resubmit' => 'إرسال إيصال جديد', 'viaMethod' => 'الدفع عبر {name}', 'queue' => 'مدفوعات بانتظار التحقق', 'customer' => 'العميل', 'methodCol' => 'الطريقة',
                'amountCol' => 'المبلغ', 'referenceCol' => 'المرجع', 'sent' => 'أُرسلت', 'statusCol' => 'الحالة', 'search' => 'ابحث في المدفوعات', 'verify' => 'تحقق',
                'reject' => 'رفض', 'viewReceipt' => 'عرض الإيصال', 'rejectTitle' => 'رفض هذه الدفعة؟', 'rejectDescription' => 'سيُطلب من {who} إرسال إيصال جديد.',
                'reason' => 'السبب', 'reasonHint' => 'اذكر ما لم يتطابق: المبلغ أو التاريخ أو المرجع.', 'confirmReject' => 'رفض الدفعة', 'emptyQueue' => 'لا شيء للتحقق منه',
                'emptyQueueDescription' => 'ستظهر الإيصالات المرسلة هنا.', 'queueLabel' => 'مدفوعات بانتظار التحقق', 'close' => 'إغلاق',
            ];

            return array_replace_recursive(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        /** Fills {name} placeholders. */
        function nq_payments_say(string $text, array $values = []): string
        {
            foreach ($values as $key => $value) {
                $text = str_replace('{'.$key.'}', (string) $value, $text);
            }

            return $text;
        }

        /** Minor units to the major amount for a currency (JPY has no decimals, KWD three). */
        function nq_payments_major(int|float $minor, string $currency): float
        {
            $digits = match (strtoupper($currency)) {
                'JPY', 'KRW', 'VND', 'CLP' => 0,
                'KWD', 'BHD', 'OMR', 'JOD', 'TND' => 3,
                default => 2,
            };

            return $minor / (10 ** $digits);
        }

        /** The fee for an amount in minor units: the percentage rounded half up, plus the flat fee. */
        function nq_payments_fee(int $amount, ?array $fee): int
        {
            if (! $fee || $amount <= 0) {
                return 0;
            }
            $bps = (int) ($fee['percentBps'] ?? 0);

            return intdiv($amount * $bps * 2 + 10000, 20000) + (int) ($fee['fixed'] ?? 0);
        }

        /** "min" or "max" when the amount is outside the method's limits, else null. */
        function nq_payments_limit(int $amount, array $method): ?string
        {
            if (isset($method['min']) && $amount < $method['min']) {
                return 'min';
            }
            if (isset($method['max']) && $amount > $method['max']) {
                return 'max';
            }

            return null;
        }

        /** The Status tone of each verification state. */
        function nq_payments_tone(string $status): string
        {
            return ['unpaid' => 'neutral', 'submitted' => 'info', 'verifying' => 'warning', 'verified' => 'success', 'rejected' => 'danger'][$status] ?? 'neutral';
        }
    }
@endphp
