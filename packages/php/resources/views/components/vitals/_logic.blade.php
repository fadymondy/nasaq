{{-- Internal: the words and pure helpers of the vitals panel, ported from vitals.tsx and vitals-math.ts.
     Included with @include('nasaq::components.vitals._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_vt_words')) {
        /** The panel's words for a locale ($override merged over them). */
        function nq_vt_words(string $locale, array $override = []): array
        {
            $en = ['title' => 'Vitals', 'measuredOn' => 'Measured %s', 'weight' => 'Weight', 'bmi' => 'Body mass index', 'bodyWater' => 'Body water', 'visceralFat' => 'Visceral fat', 'muscleMass' => 'Muscle mass', 'metabolicAge' => 'Metabolic age', 'restingHeartRate' => 'Resting heart rate', 'categories' => ['underweight' => 'Underweight', 'normal' => 'Normal range', 'overweight' => 'Overweight', 'obese' => 'Obese'], 'bmiNote' => 'Body mass index is a rough screening figure, not a diagnosis.', 'trendLabel' => '%s, recent trend', 'targets' => 'Targets', 'targetsDescription' => 'How far each figure is from the target you set.', 'noBaseline' => 'Targets appear once a baseline measurement is set.', 'onTarget' => 'On target', 'inProgress' => 'In progress', 'toGo' => 'To go', 'empty' => 'No measurements yet.', 'notMeasured' => 'Not measured'];
            $ar = ['title' => 'المؤشرات الحيوية', 'measuredOn' => 'قيس في %s', 'weight' => 'الوزن', 'bmi' => 'مؤشر كتلة الجسم', 'bodyWater' => 'ماء الجسم', 'visceralFat' => 'الدهون الحشوية', 'muscleMass' => 'الكتلة العضلية', 'metabolicAge' => 'العمر الأيضي', 'restingHeartRate' => 'نبض الراحة', 'categories' => ['underweight' => 'نحافة', 'normal' => 'ضمن المعدل', 'overweight' => 'وزن زائد', 'obese' => 'سمنة'], 'bmiNote' => 'مؤشر كتلة الجسم رقم تقريبي للفرز، وليس تشخيصًا.', 'trendLabel' => '%s، الاتجاه الأخير', 'targets' => 'الأهداف', 'targetsDescription' => 'بُعد كل رقم عن الهدف الذي حددته.', 'noBaseline' => 'تظهر الأهداف بعد تسجيل قياس أساسي.', 'onTarget' => 'عند الهدف', 'inProgress' => 'قيد التقدّم', 'toGo' => 'المتبقي', 'empty' => 'لا قياسات بعد.', 'notMeasured' => 'لم يُقس'];
            $base = str_starts_with($locale, 'ar') ? $ar : $en;
            foreach ($override as $key => $value) {
                $base[$key] = is_array($value) && isset($base[$key]) && is_array($base[$key]) ? array_merge($base[$key], $value) : $value;
            }

            return $base;
        }

        /** Weight over height squared, one decimal. Null when either input is missing or not positive. */
        function nq_vt_bmi($weightKg, $heightCm): ?float
        {
            if (! $weightKg || ! $heightCm || $weightKg <= 0 || $heightCm <= 0) {
                return null;
            }
            $m = $heightCm / 100;

            return round($weightKg / ($m * $m), 1);
        }

        /** Adult cut-offs, kg/m²: under 18.5, under 25, under 30, then obese. */
        function nq_vt_category(float $bmi): string
        {
            return $bmi < 18.5 ? 'underweight' : ($bmi < 25 ? 'normal' : ($bmi < 30 ? 'overweight' : 'obese'));
        }

        /** Tone for a category: normal success, obese danger, the others warning. */
        function nq_vt_tone(string $category): string
        {
            return $category === 'normal' ? 'success' : ($category === 'obese' ? 'danger' : 'warning');
        }

        function nq_vt_percent(float|int|null $percent): float
        {
            return is_numeric($percent) ? min(100, max(0, (float) $percent)) : 0.0;
        }

        /** Signed distance from the current value to the target; 0 when on target. */
        function nq_vt_distance(array $target): float
        {
            return ! empty($target['onTarget']) ? 0.0 : round(($target['target'] - $target['current']) * 10) / 10;
        }

        /** The figure text with its unit: kilogram, percent, level, year, bmi, bpm. */
        function nq_vt_measure_text(float|int $value, string $unit, string $locale, int $maxFraction = 0, bool $long = false): string
        {
            $ar = str_starts_with($locale, 'ar');
            $figure = nq_health_number($value, $locale, $maxFraction);

            return match ($unit) {
                'kilogram' => $figure.' '.($ar ? 'كغ' : 'kg'),
                'percent' => $figure.($ar ? '٪' : '%'),
                'level' => $figure,
                'bmi' => $figure.' kg/m²',
                'bpm' => $figure.' bpm',
                'year' => $figure.' '.($ar ? ($value >= 3 && $value <= 10 ? 'سنوات' : 'سنة') : ($long ? ($value == 1 ? 'year' : 'years') : 'yr')),
                default => $figure.' '.$unit,
            };
        }

        /** A medium date ("Sep 29, 2026") in the locale. */
        function nq_vt_date($value, string $locale): string
        {
            $d = nq_health_date($value);
            if (! class_exists(\IntlDateFormatter::class)) {
                return $d->format('M j, Y');
            }
            $f = new \IntlDateFormatter(str_replace('_', '-', $locale).'@numbers=latn', \IntlDateFormatter::MEDIUM, \IntlDateFormatter::NONE, $d->getTimezone()->getName());

            return $f->format($d);
        }

        /** The figure in an LTR isolate, as the React Measure. */
        function nq_vt_measure(float|int $value, string $unit, string $locale, int $maxFraction = 0, bool $long = false): string
        {
            return '<bdi data-slot="measure" data-numeric="" dir="ltr" class="tabular-nums [unicode-bidi:isolate]">'.e(nq_vt_measure_text($value, $unit, $locale, $maxFraction, $long)).'</bdi>';
        }
    }
@endphp
