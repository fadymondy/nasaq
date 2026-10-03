{{-- Internal: delivery formatting helpers shared by courier-card and route-stops (port of web/src/lib/delivery.ts).
     Included with @include('nasaq::components.courier-card._delivery'); every function is defined once. --}}
@php
    if (! function_exists('nq_delivery_currency')) {
        /** USD, or SAR in Arabic, unless the app configures one. */
        function nq_delivery_currency(string $locale): string
        {
            return config('nasaq.currency') ?? (str_starts_with($locale, 'ar') ? 'SAR' : 'USD');
        }

        /** Formats minor units (cents, halalas) with Latin digits; a Latin currency code or symbol is bidi-isolated. */
        function nq_delivery_money(int|float $minor, ?string $currency, string $locale): string
        {
            $currency = strtoupper($currency ?? nq_delivery_currency($locale));
            $lang = (str_starts_with($locale, 'ar') ? 'ar' : str_replace('_', '-', $locale)).'@numbers=latn';
            if (! class_exists(\NumberFormatter::class)) {
                return $currency.' '.number_format($minor / 100, 2);
            }
            $factor = 100;
            $digits = new \NumberFormatter('en', \NumberFormatter::CURRENCY);
            $digits->setTextAttribute(\NumberFormatter::CURRENCY_CODE, $currency);
            $max = $digits->getAttribute(\NumberFormatter::MAX_FRACTION_DIGITS);
            if (is_int($max) && $max >= 0) {
                $factor = 10 ** $max;
            }
            $text = (new \NumberFormatter($lang, \NumberFormatter::CURRENCY))->formatCurrency($minor / $factor, $currency);

            return (string) preg_replace('/[A-Za-z][A-Za-z.]*/u', "\u{2066}$0\u{2069}", (string) $text);
        }

        /** "850 m" under a kilometre, "1.2 km" above; Arabic uses م and كم. */
        function nq_delivery_distance(int|float $meters, string $locale): string
        {
            $ar = str_starts_with($locale, 'ar');
            $m = max(0, $meters);
            if ($m < 1000) {
                return number_format((int) round($m)).' '.($ar ? 'م' : 'm');
            }
            $km = round($m / 1000, $m < 10000 ? 1 : 0);

            return number_format($km, floor($km) == $km ? 0 : 1).' '.($ar ? 'كم' : 'km');
        }

        /** "12 min" or "1 h 5 min" from seconds, rounded up to a whole minute; Arabic uses د and س. */
        function nq_delivery_duration(int|float $seconds, string $locale): string
        {
            $ar = str_starts_with($locale, 'ar');
            $total = max(1, (int) ceil(max(0, $seconds) / 60));
            $h = intdiv($total, 60);
            $m = $total % 60;
            $hu = $ar ? 'س' : 'h';
            $mu = $ar ? 'د' : 'min';
            if ($h === 0) {
                return $m.' '.$mu;
            }

            return $m === 0 ? $h.' '.$hu : $h.' '.$hu.' '.$m.' '.$mu;
        }

        /** Progress and cash totals of a trip: total, done, currentId (first pending), cashPending, cashCollected (minor units). */
        function nq_delivery_route_summary(array $stops): array
        {
            $done = 0;
            $currentId = null;
            $pending = 0;
            $collected = 0;
            foreach ($stops as $s) {
                $status = $s['status'] ?? 'pending';
                if ($status === 'done') {
                    $done++;
                    $collected += $s['cashMinor'] ?? 0;
                } elseif ($status === 'pending') {
                    $currentId ??= $s['id'];
                    $pending += $s['cashMinor'] ?? 0;
                }
            }

            return ['total' => count($stops), 'done' => $done, 'currentId' => $currentId, 'cashPending' => $pending, 'cashCollected' => $collected];
        }
    }
@endphp
