{{-- Internal: the words and pure figures shared by the business reports, ported from business-reports strings.ts and business-reports-math.ts.
     Included with @include('nasaq::components.business-reports._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_br_words')) {
        /** The reports' own words for a locale, with the host's overrides on top. %s / %d are filled with sprintf. */
        function nq_br_words(string $locale, array $override = []): array
        {
            $en = ['revenue' => 'Revenue', 'cost' => 'Cost', 'profit' => 'Profit', 'margin' => 'Margin', 'breakdown' => 'Where the revenue goes', 'band' => ['loss' => 'Loss', 'thin' => 'Thin', 'healthy' => 'Healthy'], 'noRevenue' => 'No revenue', 'trend' => 'Trend', 'hours' => 'Hours', 'subject' => 'Project', 'empty' => 'Nothing to report for this period.', 'total' => 'Total', 'kpiTeam' => 'Team attainment', 'kpiAhead' => 'At or above target', 'kpiBehind' => 'Behind target', 'kpiStatus' => ['ahead' => 'Ahead', 'on-track' => 'On track', 'behind' => 'Behind'], 'employee' => 'Employee', 'target' => 'Target', 'actual' => 'Actual', 'view' => 'View', 'chart' => 'Chart', 'table' => 'Table', 'stage' => 'Stage', 'deals' => 'Deals', 'value' => 'Value', 'average' => 'Average deal', 'fromPrevious' => 'From previous', 'fromFirst' => 'From first', 'pipelineValue' => 'Pipeline value', 'winRate' => 'Win rate', 'won' => 'Won', 'open' => 'Open', 'firstResponse' => 'First response', 'resolution' => 'Resolution time', 'csat' => 'Satisfaction', 'sla' => 'Within SLA', 'volume' => 'Ticket volume', 'created' => 'Created', 'resolved' => 'Resolved', 'byStatus' => 'Tickets by status', 'agents' => 'Agents', 'agent' => 'Agent', 'assigned' => 'Assigned', 'resolvedShort' => 'Resolved'];
            $ar = ['revenue' => 'الإيرادات', 'cost' => 'التكلفة', 'profit' => 'الربح', 'margin' => 'الهامش', 'breakdown' => 'أين تذهب الإيرادات', 'band' => ['loss' => 'خسارة', 'thin' => 'ضعيف', 'healthy' => 'جيد'], 'noRevenue' => 'بلا إيرادات', 'trend' => 'الاتجاه', 'hours' => 'الساعات', 'subject' => 'المشروع', 'empty' => 'لا شيء للإبلاغ عنه في هذه الفترة.', 'total' => 'الإجمالي', 'kpiTeam' => 'تحقيق الفريق', 'kpiAhead' => 'بلغ الهدف أو تجاوزه', 'kpiBehind' => 'دون الهدف', 'kpiStatus' => ['ahead' => 'متقدّم', 'on-track' => 'على المسار', 'behind' => 'متأخر'], 'employee' => 'الموظف', 'target' => 'الهدف', 'actual' => 'الفعلي', 'view' => 'العرض', 'chart' => 'مخطط', 'table' => 'جدول', 'stage' => 'المرحلة', 'deals' => 'الصفقات', 'value' => 'القيمة', 'average' => 'متوسط الصفقة', 'fromPrevious' => 'من السابقة', 'fromFirst' => 'من الأولى', 'pipelineValue' => 'قيمة المسار', 'winRate' => 'نسبة الفوز', 'won' => 'مكسوبة', 'open' => 'مفتوحة', 'firstResponse' => 'أول رد', 'resolution' => 'زمن الحل', 'csat' => 'الرضا', 'sla' => 'ضمن اتفاقية الخدمة', 'volume' => 'حجم التذاكر', 'created' => 'المُنشأة', 'resolved' => 'المحلولة', 'byStatus' => 'التذاكر حسب الحالة', 'agents' => 'الموظفون', 'agent' => 'الموظف', 'assigned' => 'المُسندة', 'resolvedShort' => 'المحلولة'];
            $en += ['losingOne' => '1 loses money', 'losingMany' => '%d lose money', 'kpiOf' => '%s of %s', 'attainment' => '%s: %s of target', 'moreFor' => 'Actions for %s'];
            $ar += ['losingOne' => 'واحد يخسر', 'losingMany' => '%d تخسر', 'kpiOf' => '%s من %s', 'attainment' => '%s: %s من الهدف', 'moreFor' => 'إجراءات %s'];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        /** A number as text with Latin digits: style decimal | percent | currency; $format may carry currency, compact, minFraction, maxFraction. */
        function nq_br_number(int|float $value, array $format = [], ?string $locale = null, bool $sign = false): string
        {
            $locale ??= app()->getLocale();
            $style = $format['style'] ?? (isset($format['currency']) ? 'currency' : 'decimal');
            $max = $format['maxFraction'] ?? ($style === 'percent' ? 1 : ($style === 'currency' ? 0 : 1));
            $suffix = '';
            if (! empty($format['compact'])) {
                foreach ([1e9 => 'B', 1e6 => 'M', 1e3 => 'K'] as $size => $s) {
                    if (abs($value) >= $size) {
                        $value /= $size;
                        $suffix = $s;
                        $max = $format['maxFraction'] ?? 1;
                        break;
                    }
                }
            }
            $tag = (str_starts_with($locale, 'ar') ? 'ar-SA' : str_replace('_', '-', $locale)).'@numbers=latn';
            if (class_exists(\NumberFormatter::class)) {
                $f = new \NumberFormatter($tag, match ($style) { 'percent' => \NumberFormatter::PERCENT, 'currency' => \NumberFormatter::CURRENCY, default => \NumberFormatter::DECIMAL });
                $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, (int) $max);
                if (isset($format['minFraction'])) {
                    $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, (int) $format['minFraction']);
                } elseif ($style === 'currency') {
                    $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, 0);
                }
                $text = $style === 'currency' ? $f->formatCurrency((float) $value, $format['currency'] ?? \Nasaq\Nasaq::currency($locale)) : $f->format($value);
            } else {
                $text = ($style === 'currency' ? ($format['currency'] ?? \Nasaq\Nasaq::currency($locale)).' ' : '').number_format($value, (int) $max).($style === 'percent' ? '%' : '');
            }
            $text = (string) $text.$suffix;

            return $sign && $value > 0 ? '+'.$text : $text;
        }

        /** Minutes as a short duration: "38 min" under two hours, then "5.2 hr" (ar: د / س). */
        function nq_br_duration(int|float $minutes, ?string $locale = null): string
        {
            $ar = str_starts_with($locale ?? app()->getLocale(), 'ar');
            if ($minutes >= 120) {
                return nq_br_number($minutes / 60, ['maxFraction' => 1], $locale).' '.($ar ? 'س' : 'hr');
            }

            return nq_br_number($minutes, ['maxFraction' => 0], $locale).' '.($ar ? 'د' : 'min');
        }

        /** Profit as a fraction of revenue; null when there is no revenue. */
        function nq_br_margin(int|float $revenue, int|float $cost): float|int|null
        {
            return $revenue > 0 ? ($revenue - $cost) / $revenue : null;
        }

        /** loss below zero, thin below $thinBelow, else healthy. */
        function nq_br_band(float|int|null $margin, float $thinBelow = 0.15): string
        {
            if ($margin === null) {
                return 'thin';
            }

            return $margin < 0 ? 'loss' : ($margin < $thinBelow ? 'thin' : 'healthy');
        }

        /** Actual against target as a fraction; no target gives 0. */
        function nq_br_attainment(int|float $actual, int|float $target): float
        {
            return $target > 0 ? $actual / $target : 0.0;
        }

        /** ahead from 100%, on-track from $onTrackAt, else behind. */
        function nq_br_status(float $fraction, float $onTrackAt = 0.8): string
        {
            return $fraction >= 1 ? 'ahead' : ($fraction >= $onTrackAt ? 'on-track' : 'behind');
        }

        /** The pipeline stage by stage: fromPrevious, fromFirst and average deal. */
        function nq_br_pipeline_rows(array $stages): array
        {
            $stages = array_values($stages);
            $first = $stages[0]['count'] ?? 0;
            $out = [];
            foreach ($stages as $i => $s) {
                $prev = $i === 0 ? $s['count'] : ($stages[$i - 1]['count'] ?? 0);
                $out[] = [
                    'stage' => $s,
                    'fromPrevious' => $prev > 0 ? $s['count'] / $prev : 0,
                    'fromFirst' => $first > 0 ? $s['count'] / $first : 0,
                    'average' => $s['count'] > 0 ? $s['value'] / $s['count'] : 0,
                ];
            }

            return $out;
        }

        /** Won share of everything that entered the pipeline. */
        function nq_br_win_rate(array $stages): float
        {
            $stages = array_values($stages);
            $first = $stages[0]['count'] ?? 0;
            $won = null;
            foreach ($stages as $s) {
                if (! empty($s['won'])) {
                    $won = $s['count'];
                    break;
                }
            }
            $won ??= $stages ? $stages[count($stages) - 1]['count'] : 0;

            return $first > 0 ? $won / $first : 0.0;
        }
    }
@endphp
