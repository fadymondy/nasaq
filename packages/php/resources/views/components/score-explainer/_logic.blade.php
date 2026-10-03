{{-- Internal: the words and pure helpers of the score explainer, ported from score-explainer.tsx and score-explainer-logic.ts.
     Included with @include('nasaq::components.score-explainer._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_score_words')) {
        /** The words of the score explainer for the locale, with the host's overrides on top ("bands" may be partial). Templates use {n}, {max}, {score}, {band}. */
        function nq_score_words(array $override = []): array
        {
            $en = [
                'score' => 'Score', 'outOf' => 'out of {max}', 'bands' => ['high' => 'High', 'medium' => 'Medium', 'low' => 'Low'], 'why' => 'Why this score',
                'showWhy' => 'Show why', 'ariaBadge' => 'Score {score} of {max}, {band}. Show why', 'inferred' => 'Inferred',
                'inferredHint' => 'Worked out by the model from other signals. No source states it directly.', 'sources' => 'Sources', 'matched' => 'Matched',
                'points' => '{n} of {max} points', 'pointsNoMax' => '{n} points', 'other' => 'Other factors', 'otherReason' => 'Points that no single signal above accounts for.',
                'noDimensions' => 'No reasons were recorded for this score.', 'opensNewTab' => 'opens in a new tab', 'dimensionConfidence' => 'Confidence',
            ];
            $ar = [
                'score' => 'الدرجة', 'outOf' => 'من {max}', 'bands' => ['high' => 'مرتفعة', 'medium' => 'متوسطة', 'low' => 'منخفضة'], 'why' => 'سبب هذه الدرجة',
                'showWhy' => 'عرض السبب', 'ariaBadge' => 'الدرجة {score} من {max}، {band}. عرض السبب', 'inferred' => 'مستنتج',
                'inferredHint' => 'استنتجه النموذج من إشارات أخرى. لا يذكره أي مصدر صراحةً.', 'sources' => 'المصادر', 'matched' => 'المطابق',
                'points' => '{n} من {max} نقطة', 'pointsNoMax' => '{n} نقطة', 'other' => 'عوامل أخرى', 'otherReason' => 'نقاط لا تفسرها إشارة واحدة من الإشارات أعلاه.',
                'noDimensions' => 'لم تُسجَّل أسباب لهذه الدرجة.', 'opensNewTab' => 'يفتح في تبويب جديد', 'dimensionConfidence' => 'الثقة',
            ];
            $base = \Nasaq\Nasaq::rtl() ? $ar : $en;
            $bands = array_merge($base['bands'], (array) ($override['bands'] ?? []));
            unset($override['bands']);

            return array_merge($base, $override, ['bands' => $bands]);
        }

        /** Replaces {name}-style placeholders. */
        function nq_score_fill(string $template, array $values): string
        {
            foreach ($values as $k => $v) {
                $template = str_replace('{'.$k.'}', (string) $v, $template);
            }

            return $template;
        }

        function nq_score_clamp($score, $max = 100): float
        {
            if (! is_numeric($score)) {
                return 0.0;
            }

            return (float) min($max, max(0, $score));
        }

        /** high from 70 % of the maximum, medium from 40 %, low below. */
        function nq_score_band($score, $max = 100): string
        {
            $share = $max > 0 ? nq_score_clamp($score, $max) / $max : 0;

            return $share >= 0.7 ? 'high' : ($share >= 0.4 ? 'medium' : 'low');
        }

        /** Dimensions ordered by points, the biggest first; ties keep their order. */
        function nq_score_sort(array $dimensions): array
        {
            $rows = array_values($dimensions);
            $idx = array_keys($rows);
            usort($idx, fn ($a, $b) => ($rows[$b]['points'] <=> $rows[$a]['points']) ?: ($a <=> $b));

            return array_map(fn ($i) => $rows[$i], $idx);
        }

        /** Points the score has that no listed dimension explains (a rounding gap under 0.5 is ignored). */
        function nq_score_remainder($score, array $dimensions): float
        {
            $gap = round(($score - array_sum(array_column($dimensions, 'points'))) * 10) / 10;

            return abs($gap) < 0.5 ? 0.0 : (float) $gap;
        }

        /** How full a dimension's bar is, 0 to 1. */
        function nq_score_fill_ratio(array $dimension, $max = 100): float
        {
            $ceiling = ! empty($dimension['maxPoints']) && $dimension['maxPoints'] > 0 ? $dimension['maxPoints'] : $max;

            return (float) min(1, max(0, $dimension['points'] / $ceiling));
        }

        /** One decimal, no trailing zero. */
        function nq_score_round1($n): string
        {
            return (string) (round($n * 10) / 10);
        }
    }
@endphp
