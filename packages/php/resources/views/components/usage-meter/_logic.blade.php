{{-- Internal: helpers of x-nq::usage-meter, ported from usage-meter.tsx and usage-math.ts. Included with
     @include('nasaq::components.usage-meter._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_um_words')) {
        /** The built-in words by locale (English or Arabic), with the host's overrides on top. A string with :n, :a, :b placeholders is a sentence. */
        function nq_um_words(string $locale, array $override = []): array
        {
            $en = [
                'unlimited' => 'Unlimited', 'of' => 'of', 'left' => ':n left', 'warning' => 'Approaching the limit', 'danger' => 'Almost at the limit',
                'over' => 'Over the limit by :n', 'hoursUnit' => 'h', 'hours' => 'Hours', 'budget' => 'Budget',
                'projectedOver' => 'On pace for :a, :b over budget', 'projectedWithin' => 'On pace for :a', 'periodElapsed' => ':n of the period has passed',
                'planUsage' => 'Plan usage', 'plan' => ':n plan', 'period' => 'Current period', 'overageTitle' => 'Estimated overage',
                'overageNone' => 'No overage so far', 'overageNoneBody' => 'Everything is within your plan limits.',
                'overageBody' => 'Charged with your next invoice if usage stays this high.', 'overageLine' => ':n: :a over, :b',
                'upgrade' => 'Upgrade plan', 'loading' => 'Loading usage',
            ];
            $ar = [
                'unlimited' => 'غير محدود', 'of' => 'من', 'left' => 'متبقٍ :n', 'warning' => 'اقتربت من الحد', 'danger' => 'أوشكت على بلوغ الحد',
                'over' => 'تجاوزت الحد بمقدار :n', 'hoursUnit' => 'س', 'hours' => 'الساعات', 'budget' => 'الميزانية',
                'projectedOver' => 'الوتيرة الحالية تصل إلى :a، أي :b فوق الميزانية', 'projectedWithin' => 'الوتيرة الحالية تصل إلى :a', 'periodElapsed' => 'مضى :n من الفترة',
                'planUsage' => 'استخدام الباقة', 'plan' => 'باقة :n', 'period' => 'الفترة الحالية', 'overageTitle' => 'التجاوز التقديري',
                'overageNone' => 'لا تجاوز حتى الآن', 'overageNoneBody' => 'كل شيء ضمن حدود باقتك.',
                'overageBody' => 'يُحاسَب مع فاتورتك القادمة إذا بقي الاستخدام بهذا المستوى.', 'overageLine' => ':n: تجاوز :a، :b',
                'upgrade' => 'ترقية الباقة', 'loading' => 'جارٍ تحميل الاستخدام',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        /** Fills the :n, :a and :b placeholders of a built-in sentence. */
        function nq_um_fill(string $sentence, string $n = '', string $a = '', string $b = ''): string
        {
            return strtr($sentence, [':n' => $n, ':a' => $a, ':b' => $b]);
        }

        /** An amount of a usage kind: "1,200 seats", "$45", "12.5 h". Plain text; the markup wraps it in <bdi>. */
        function nq_um_amount(int|float $value, string $kind, string $locale, array $t, ?string $unit = null, ?string $currency = null): string
        {
            $latn = str_replace('_', '-', $locale).'@numbers=latn';
            if ($kind === 'money') {
                $currency = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
                if (! class_exists(\NumberFormatter::class)) {
                    return $currency.' '.number_format($value, floor($value) == $value ? 0 : 2);
                }
                $f = new \NumberFormatter($latn, \NumberFormatter::CURRENCY);
                $whole = floor($value) == $value;
                $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, $whole ? 0 : 2);
                $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, 2);

                return $f->formatCurrency($value, $currency);
            }
            $max = $kind === 'hours' ? 1 : 2;
            if (class_exists(\NumberFormatter::class)) {
                $f = new \NumberFormatter($latn, \NumberFormatter::DECIMAL);
                $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $max);
                $n = $f->format($value);
            } else {
                $n = rtrim(rtrim(number_format($value, $max), '0'), '.');
            }
            $suffix = $kind === 'hours' ? $t['hoursUnit'] : $unit;

            return $suffix ? $n.' '.$suffix : $n;
        }

        /** used / limit. Null (unlimited) is 0; a zero limit that is used is 1. Not clamped. */
        function nq_um_fraction(int|float $used, int|float|null $limit): float
        {
            if ($limit === null) {
                return 0.0;
            }
            if ($limit <= 0) {
                return $used > 0 ? 1.0 : 0.0;
            }

            return max(0, $used) / $limit;
        }

        /** "over" past the limit, then "danger" from dangerAt, "warning" from warnAt, otherwise "ok". Unlimited is always "ok". */
        function nq_um_tone(int|float $used, int|float|null $limit, array $thresholds = []): string
        {
            if ($limit === null) {
                return 'ok';
            }
            if ($used > $limit) {
                return 'over';
            }
            $f = nq_um_fraction($used, $limit);
            if ($f >= ($thresholds['dangerAt'] ?? 0.9)) {
                return 'danger';
            }

            return $f >= ($thresholds['warnAt'] ?? 0.75) ? 'warning' : 'ok';
        }

        /** Units past the limit times the rate. 0 within the limit, unlimited or unpriced. */
        function nq_um_overage(array $item): float
        {
            $limit = $item['limit'] ?? null;
            if ($limit === null || ! isset($item['overageRate'])) {
                return 0.0;
            }

            return max(0, $item['used'] - $limit) * $item['overageRate'];
        }

        /** Linear burn: elapsed is the fraction of the period gone (0..1). Returns projected, willExceed, overBy and remaining. */
        function nq_um_burn(int|float $used, int|float $budget, int|float $elapsed): array
        {
            $e = min(1, max(0, $elapsed));
            $projected = $e > 0 ? $used / $e : $used;

            return ['projected' => $projected, 'willExceed' => $projected > $budget, 'overBy' => max(0, $projected - $budget), 'remaining' => max(0, $budget - $used)];
        }
    }
@endphp
