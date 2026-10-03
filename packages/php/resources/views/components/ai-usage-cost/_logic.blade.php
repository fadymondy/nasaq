{{-- Internal: helpers of x-nq::ai-usage-cost and x-nq::ai-usage-cost.token-meter, ported from ai-usage-cost.tsx and usage-cost-math.ts.
     Included with @include('nasaq::components.ai-usage-cost._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_auc_words')) {
        /** The built-in words for a locale. Sentences use %s placeholders. */
        function nq_auc_words(string $locale, array $override = []): array
        {
            $en = [
                'total' => 'Total cost', 'tokens' => 'Tokens', 'billed' => 'Billed', 'unbilled' => 'Unbilled', 'clientPrice' => 'Client price (+%s)',
                'daily' => 'Cost per day', 'dailyHint' => 'Billed and unbilled spend, by day', 'model' => 'Model', 'product' => 'Product', 'run' => 'Run',
                'byModel' => 'By model', 'byProduct' => 'By product', 'byRun' => 'By run', 'tokensIn' => 'In', 'tokensOut' => 'Out', 'cost' => 'Cost',
                'vsPrevious' => 'vs previous period', 'breakdownBy' => 'Cost breakdown', 'chartLabel' => 'Daily cost, %d days', 'input' => 'Input',
                'output' => 'Output', 'cached' => 'Cached', 'budget' => 'Run budget', 'tokenSplit' => 'Token split', 'tokenTotal' => '%s tokens',
            ];
            $ar = [
                'total' => 'إجمالي التكلفة', 'tokens' => 'الرموز', 'billed' => 'مفوتر', 'unbilled' => 'غير مفوتر', 'clientPrice' => 'سعر العميل (+%s)',
                'daily' => 'التكلفة اليومية', 'dailyHint' => 'الإنفاق المفوتر وغير المفوتر حسب اليوم', 'model' => 'النموذج', 'product' => 'المنتج', 'run' => 'التشغيل',
                'byModel' => 'حسب النموذج', 'byProduct' => 'حسب المنتج', 'byRun' => 'حسب التشغيل', 'tokensIn' => 'دخل', 'tokensOut' => 'خرج', 'cost' => 'التكلفة',
                'vsPrevious' => 'مقارنة بالفترة السابقة', 'breakdownBy' => 'تفصيل التكلفة', 'chartLabel' => 'التكلفة اليومية، %d يومًا', 'input' => 'الإدخال',
                'output' => 'الإخراج', 'cached' => 'مخزّن مؤقتًا', 'budget' => 'ميزانية التشغيل', 'tokenSplit' => 'توزيع الرموز', 'tokenTotal' => '%s رمز',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        /** A figure as plain text with Latin digits: money (max fraction digits $max) or compact (1.2K). */
        function nq_auc_fmt(int|float $v, string $locale, string $kind = 'compact', ?string $currency = null, int $max = 2): string
        {
            $tag = str_replace('_', '-', $locale).'@numbers=latn';
            if ($kind === 'money') {
                $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
                if (! class_exists(\NumberFormatter::class)) {
                    return $code.' '.number_format($v, $max);
                }
                $f = new \NumberFormatter($tag, \NumberFormatter::CURRENCY);
                $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $max);
                $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, $max);

                return $f->formatCurrency($v, $code);
            }
            $units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
            [$div, $suffix] = [1, ''];
            foreach ($units as $u) {
                if (abs($v) >= $u[0]) {
                    [$div, $suffix] = $u;
                    break;
                }
            }

            return rtrim(rtrim(number_format(round($v / $div, abs($v / $div) < 10 ? 1 : 0), 1, '.', ','), '0'), '.').$suffix;
        }

        /** "28 Sep" in the locale. */
        function nq_auc_day(string $date, string $locale): string
        {
            $c = \Carbon\Carbon::parse(substr($date, 0, 10), 'UTC');
            if (! class_exists(\IntlDateFormatter::class) || ! class_exists(\IntlDatePatternGenerator::class)) {
                return $c->format('M j');
            }
            $tag = str_replace('_', '-', $locale).'@numbers=latn';
            $pattern = (new \IntlDatePatternGenerator($tag))->getBestPattern('MMMd');

            return (new \IntlDateFormatter($tag, \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, 'UTC', null, $pattern))->format($c);
        }

        /** Input (not cached), output and cached shares of a run, summing to 1 (all 0 when nothing was used). */
        function nq_auc_split(int|float $in, int|float $out, int|float $cached = 0): array
        {
            $c = min(max(0, $cached), max(0, $in));
            $total = $in + $out;
            if ($total <= 0) {
                return ['input' => 0, 'output' => 0, 'cached' => 0];
            }

            return ['input' => ($in - $c) / $total, 'output' => $out / $total, 'cached' => $c / $total];
        }
    }
@endphp
