{{-- Internal: strings and helpers shared by the wallet parts (port of web/src/components/wallet/wallet-math.ts and the strings in wallet.tsx).
     Included with @include('nasaq::components.wallet._wallet'); every function is defined once.
     Strings with a value in them use {amount} placeholders (the JS side fills them in). --}}
@php
    if (! function_exists('nq_wallet_strings')) {
        /** The built-in words for a locale, with `$labels` laid over them. */
        function nq_wallet_strings(string $locale, array $labels = []): array
        {
            $ar = str_starts_with($locale, 'ar');

            return array_merge($ar ? [
                'balance' => 'الرصيد المتاح', 'pending' => 'قيد المعالجة', 'topUp' => 'إضافة رصيد', 'payout' => 'سحب', 'show' => 'إظهار الرصيد',
                'hide' => 'إخفاء الرصيد', 'hidden' => 'الرصيد مخفي', 'trend' => 'الرصيد خلال آخر 30 يومًا', 'transactions' => 'المعاملات',
                'all' => 'الكل', 'incoming' => 'الوارد', 'outgoing' => 'الصادر', 'filter' => 'تصفية المعاملات', 'emptyTitle' => 'لا توجد معاملات بعد',
                'emptyDescription' => 'ستظهر هنا عمليات الشحن والمدفوعات والسحب.', 'completed' => 'مكتملة', 'pendingStatus' => 'قيد المعالجة',
                'failed' => 'فاشلة', 'topup' => 'شحن', 'payoutType' => 'سحب', 'payment' => 'دفعة', 'refund' => 'استرداد', 'fee' => 'رسوم',
                'reference' => 'المرجع', 'topUpTitle' => 'إضافة رصيد', 'topUpDescription' => 'اختر المبلغ ومصدر الأموال.',
                'payoutTitle' => 'السحب إلى حسابك البنكي', 'payoutDescription' => 'يمكنك سحب حتى {amount}.', 'amount' => 'المبلغ',
                'quick' => 'مبالغ سريعة', 'source' => 'الدفع عبر', 'destination' => 'السحب إلى', 'max' => 'سحب الكل',
                'confirmTopUp' => 'إضافة {amount}', 'confirmPayout' => 'سحب {amount}', 'add' => 'إضافة', 'withdraw' => 'سحب', 'cancel' => 'إلغاء',
                'invalid' => 'أدخل مبلغًا أكبر من الصفر.', 'min' => 'الحد الأدنى {amount}.', 'max2' => 'الحد الأقصى {amount}.',
                'failedRequest' => 'لم تتم العملية. حاول مرة أخرى.', 'noAccounts' => 'أضف مصدر دفع أولًا.', 'fees' => 'تُطبَّق رسوم قدرها {amount}.',
                'today' => 'اليوم', 'yesterday' => 'أمس',
            ] : [
                'balance' => 'Available balance', 'pending' => 'Pending', 'topUp' => 'Add funds', 'payout' => 'Withdraw', 'show' => 'Show balance',
                'hide' => 'Hide balance', 'hidden' => 'Balance hidden', 'trend' => 'Balance over the last 30 days', 'transactions' => 'Transactions',
                'all' => 'All', 'incoming' => 'Money in', 'outgoing' => 'Money out', 'filter' => 'Filter transactions', 'emptyTitle' => 'No transactions yet',
                'emptyDescription' => 'Top-ups, payments and withdrawals will show here.', 'completed' => 'Completed', 'pendingStatus' => 'Pending',
                'failed' => 'Failed', 'topup' => 'Top-up', 'payoutType' => 'Withdrawal', 'payment' => 'Payment', 'refund' => 'Refund', 'fee' => 'Fee',
                'reference' => 'Reference', 'topUpTitle' => 'Add funds', 'topUpDescription' => 'Choose an amount and where the money comes from.',
                'payoutTitle' => 'Withdraw to your bank', 'payoutDescription' => 'You can withdraw up to {amount}.', 'amount' => 'Amount',
                'quick' => 'Quick amounts', 'source' => 'Pay with', 'destination' => 'Withdraw to', 'max' => 'Withdraw all',
                'confirmTopUp' => 'Add {amount}', 'confirmPayout' => 'Withdraw {amount}', 'add' => 'Add', 'withdraw' => 'Withdraw', 'cancel' => 'Cancel',
                'invalid' => 'Enter an amount greater than zero.', 'min' => 'The minimum is {amount}.', 'max2' => 'The maximum is {amount}.',
                'failedRequest' => 'That did not go through. Try again.', 'noAccounts' => 'Add a payment source first.', 'fees' => 'A fee of {amount} applies.',
                'today' => 'Today', 'yesterday' => 'Yesterday',
            ], $labels);
        }
    }

    if (! function_exists('nq_wallet_money')) {
        /** An amount with Latin digits. `$signed` adds "+" to positive amounts; `$whole` drops the decimals (presets). A Latin symbol is bidi-isolated. */
        function nq_wallet_money(float|int $amount, ?string $currency, string $locale, bool $signed = false, bool $whole = false): string
        {
            $currency = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
            if (! class_exists(\NumberFormatter::class)) {
                return ($signed && $amount > 0 ? '+' : '').$currency.' '.number_format($amount, $whole ? 0 : 2);
            }
            $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::CURRENCY);
            if ($whole) {
                $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, 0);
                $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, 0);
            }
            $text = (string) $f->formatCurrency($amount, $currency);
            $symbol = $f->getSymbol(\NumberFormatter::CURRENCY_SYMBOL);
            if (preg_match('/[A-Za-z]/', $symbol)) {
                $text = (string) preg_replace('/'.preg_quote($symbol, '/').'/u', "\u{2066}".$symbol."\u{2069}", $text, 1);
            }

            return ($signed && $amount > 0 ? '+' : '').$text;
        }
    }

    if (! function_exists('nq_wallet_parse_amount')) {
        /** Reads what people type into an amount field ("1,250.50", "١٢٥٠٫٥", "1250,5"). Null when it is not a positive number. */
        function nq_wallet_parse_amount(string $input): ?float
        {
            $text = preg_replace('/[\s\x{00A0}]/u', '', strtr($input, ['٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9', '٫' => '.', '٬' => ',']));
            if ($text === '' || $text === null) {
                return null;
            }
            $text = preg_match('/^\d+,\d{1,2}$/', $text) ? str_replace(',', '.', $text) : str_replace(',', '', $text);
            if (! preg_match('/^\d+(\.\d+)?$/', $text)) {
                return null;
            }
            $value = round((float) $text, 2);

            return $value > 0 ? $value : null;
        }
    }

    if (! function_exists('nq_wallet_check_amount')) {
        /** "invalid" | "min" | "max" | null for a parsed amount and optional limits. */
        function nq_wallet_check_amount(?float $value, float $min = 0.01, float $max = INF): ?string
        {
            if ($value === null) {
                return 'invalid';
            }

            return $value < $min ? 'min' : ($value > $max ? 'max' : null);
        }
    }

    if (! function_exists('nq_wallet_group_by_day')) {
        /** Groups items (each with a `date`) by calendar day: newest day first, newest item first inside a day. Returns [['key' => 'Y-m-d', 'date' => Carbon, 'items' => [...]], ...]. */
        function nq_wallet_group_by_day(array $items): array
        {
            $rows = [];
            foreach ($items as $item) {
                $d = $item['date'];
                $date = $d instanceof \DateTimeInterface ? \Carbon\Carbon::instance($d) : (is_numeric($d) ? \Carbon\Carbon::createFromTimestamp($d) : \Carbon\Carbon::parse($d));
                $rows[] = [$date, $item];
            }
            usort($rows, fn ($a, $b) => $b[0]->getTimestamp() <=> $a[0]->getTimestamp());
            $groups = [];
            foreach ($rows as [$date, $item]) {
                $key = $date->format('Y-m-d');
                $groups[$key] ??= ['key' => $key, 'date' => $date, 'items' => []];
                $groups[$key]['items'][] = $item;
            }

            return array_values($groups);
        }
    }

    if (! function_exists('nq_wallet_day_label')) {
        /** "Today", "Yesterday" or the medium date. */
        function nq_wallet_day_label(\Carbon\Carbon $date, array $t, string $locale): string
        {
            $diff = (int) $date->copy()->startOfDay()->diffInDays(\Carbon\Carbon::now($date->getTimezone())->startOfDay(), false);
            if ($diff === 0) {
                return $t['today'];
            }
            if ($diff === 1) {
                return $t['yesterday'];
            }

            return class_exists(\IntlDateFormatter::class)
                ? (string) (new \IntlDateFormatter(str_replace('_', '-', $locale).'@numbers=latn', \IntlDateFormatter::MEDIUM, \IntlDateFormatter::NONE, $date->getTimezone()->getName() === 'Z' ? 'UTC' : $date->getTimezone()->getName()))->format($date)
                : $date->format('M j, Y');
        }
    }
@endphp
