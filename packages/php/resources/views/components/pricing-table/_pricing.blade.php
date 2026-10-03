{{-- Internal: the plan maths and labels shared by the pricing-table parts (port of pricing-table.tsx).
     Included with @include('nasaq::components.pricing-table._pricing'); every function is defined once.
     A plan is an array: id, name, description, monthly, yearly, perSeat, custom, features, featuresTitle, badge, highlighted, trialDays, cta, footnote. --}}
@php
    if (! function_exists('nq_pricing_labels')) {
        /** The built-in strings (Arabic under an Arabic locale) with any overrides on top. Templates take :n, :total, :name and :days. */
        function nq_pricing_labels(array $override = [], ?string $locale = null): array
        {
            $strings = [
                'en' => [
                    'monthly' => 'Monthly', 'yearly' => 'Yearly', 'save' => 'Save :n%', 'billedYearly' => 'Billed :total yearly', 'billedMonthly' => 'Billed monthly',
                    'current' => 'Current plan', 'getStarted' => 'Get started', 'choose' => 'Choose :name', 'upgrade' => 'Upgrade', 'downgrade' => 'Downgrade',
                    'trial' => 'Start :days-day free trial', 'contactSales' => 'Contact sales', 'included' => 'Included', 'notIncluded' => 'Not included', 'feature' => 'Feature', 'period' => 'Billing period',
                ],
                'ar' => [
                    'monthly' => 'شهري', 'yearly' => 'سنوي', 'save' => 'وفّر :n٪', 'billedYearly' => 'تُدفع :total سنويًا', 'billedMonthly' => 'تُدفع شهريًا',
                    'current' => 'خطتك الحالية', 'getStarted' => 'ابدأ الآن', 'choose' => 'اختر :name', 'upgrade' => 'ترقية', 'downgrade' => 'تخفيض الخطة',
                    'trial' => 'ابدأ تجربة مجانية لمدة :days يومًا', 'contactSales' => 'تواصل مع المبيعات', 'included' => 'مشمول', 'notIncluded' => 'غير مشمول', 'feature' => 'الميزة', 'period' => 'دورة الفوترة',
                ],
            ];

            return array_merge($strings[\Nasaq\Nasaq::rtl($locale) ? 'ar' : 'en'], $override);
        }

        /** Fills a label template: nq_pricing_fill('Save :n%', ['n' => 20]). */
        function nq_pricing_fill(string $template, array $vars): string
        {
            foreach ($vars as $key => $value) {
                $template = str_replace(':'.$key, (string) $value, $template);
            }

            return $template;
        }

        /** The price shown for a plan in a period: per month, with the monthly price as compareAt when yearly is cheaper. */
        function nq_pricing_price(array $plan, string $period): ?array
        {
            $monthly = $plan['monthly'] ?? null;
            $yearly = $plan['yearly'] ?? null;
            $amount = $period === 'year' ? ($yearly ?? $monthly) : ($monthly ?? $yearly);
            if ($amount === null) {
                return null;
            }
            $compareAt = $period === 'year' && $yearly !== null && $monthly !== null && $monthly > $yearly ? $monthly : null;

            return ['amount' => $amount, 'compareAt' => $compareAt];
        }

        /** The best yearly saving across plans, as a whole percent. 0 when yearly is never cheaper. */
        function nq_pricing_savings(array $plans): int
        {
            $best = 0;
            foreach ($plans as $p) {
                $monthly = $p['monthly'] ?? null;
                $yearly = $p['yearly'] ?? null;
                if ($monthly && $yearly !== null && $yearly < $monthly) {
                    $best = max($best, (int) round((1 - $yearly / $monthly) * 100));
                }
            }

            return $best;
        }

        /** What a plan's button says and looks like, given where the account is now: label, variant, disabled. */
        function nq_pricing_action(array $plan, array $plans, array $t, ?string $currentId = null): array
        {
            $name = is_string($plan['name'] ?? null) ? $plan['name'] : '';
            if ($currentId !== null && ($plan['id'] ?? null) === $currentId) {
                return ['label' => $t['current'], 'variant' => 'secondary', 'disabled' => true];
            }
            $highlighted = (bool) ($plan['highlighted'] ?? false);
            $variant = $highlighted ? 'primary' : 'secondary';
            if (! empty($plan['cta'])) {
                return ['label' => $plan['cta'], 'variant' => $variant, 'disabled' => false];
            }
            if (isset($plan['custom'])) {
                return ['label' => $t['contactSales'], 'variant' => 'secondary', 'disabled' => false];
            }
            if ($currentId !== null) {
                $ids = array_column($plans, 'id');
                $here = array_search($currentId, $ids, true);
                $there = array_search($plan['id'] ?? null, $ids, true);
                if ($here !== false && $there !== false) {
                    return $there > $here
                        ? ['label' => $t['upgrade'].($name !== '' ? ' · '.$name : ''), 'variant' => $highlighted || $there === $here + 1 ? 'primary' : 'secondary', 'disabled' => false]
                        : ['label' => $t['downgrade'], 'variant' => 'ghost', 'disabled' => false];
                }
            }
            if (! empty($plan['trialDays'])) {
                return ['label' => nq_pricing_fill($t['trial'], ['days' => $plan['trialDays']]), 'variant' => $variant, 'disabled' => false];
            }
            if (($plan['monthly'] ?? $plan['yearly'] ?? null) === 0) {
                return ['label' => $t['getStarted'], 'variant' => $variant, 'disabled' => false];
            }

            return ['label' => $name !== '' ? nq_pricing_fill($t['choose'], ['name' => $name]) : $t['getStarted'], 'variant' => $variant, 'disabled' => false];
        }

        /** "Billed $144 yearly" / "Billed monthly" under a price; null for custom and free plans. */
        function nq_pricing_note(array $plan, string $period, array $t, string $currency, string $locale): ?string
        {
            if (isset($plan['custom'])) {
                return null;
            }
            $price = nq_pricing_price($plan, $period);
            if (! $price || $price['amount'] == 0) {
                return null;
            }
            if ($period === 'year' && isset($plan['yearly'])) {
                $total = $plan['yearly'] * 12;
                if (class_exists(\NumberFormatter::class)) {
                    $f = new \NumberFormatter((str_starts_with($locale, 'ar') ? 'ar' : str_replace('_', '-', $locale)).'@numbers=latn', \NumberFormatter::CURRENCY);
                    $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, 0);
                    $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, 0);
                    $text = (string) $f->formatCurrency($total, $currency);
                } else {
                    $text = $currency.' '.number_format($total);
                }

                return nq_pricing_fill($t['billedYearly'], ['total' => $text]);
            }

            return $t['billedMonthly'];
        }
    }
@endphp
