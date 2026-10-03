{{-- Internal: the built-in strings shared by the upgrade-prompt parts (port of upgrade-prompt.tsx).
     Included with @include('nasaq::components.upgrade-prompt._strings'); the function is defined once.
     Templates take :name. --}}
@php
    if (! function_exists('nq_upgrade_labels')) {
        /** The built-in strings (Arabic under an Arabic locale) with any overrides on top. */
        function nq_upgrade_labels(array $override = [], ?string $locale = null): array
        {
            $strings = [
                'en' => [
                    'pro' => 'Pro', 'upgrade' => 'Upgrade', 'upgradeNow' => 'Upgrade now', 'upgradeTo' => 'Upgrade to :name', 'later' => 'Maybe later',
                    'dismiss' => 'Dismiss', 'cancelAnytime' => 'Cancel anytime. Your data stays yours.', 'endsIn' => 'Ends in', 'days' => 'd',
                    'locked' => 'Locked', 'unlock' => 'Unlock with an upgrade', 'seePlans' => 'See plans',
                ],
                'ar' => [
                    'pro' => 'احترافي', 'upgrade' => 'ترقية', 'upgradeNow' => 'رقِّ الآن', 'upgradeTo' => 'الترقية إلى :name', 'later' => 'ربما لاحقًا',
                    'dismiss' => 'إخفاء', 'cancelAnytime' => 'ألغِ في أي وقت. بياناتك تبقى لك.', 'endsIn' => 'ينتهي خلال', 'days' => 'ي',
                    'locked' => 'مقفل', 'unlock' => 'افتحها بالترقية', 'seePlans' => 'عرض الخطط',
                ],
            ];

            return array_merge($strings[\Nasaq\Nasaq::rtl($locale) ? 'ar' : 'en'], $override);
        }
    }
@endphp
