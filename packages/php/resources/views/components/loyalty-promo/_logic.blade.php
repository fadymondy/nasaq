{{-- Internal: the words and pure helpers shared by the loyalty and promo components, ported from loyalty-promo strings and loyalty-logic.ts.
     Included with @include('nasaq::components.loyalty-promo._logic'); every function is defined once. {0} and {1} in a word are filled by nq_loyalty_say. --}}
@php
    if (! function_exists('nq_loyalty_words')) {
        /** The components' own words for a locale, with the host's overrides on top (nested keys merge). */
        function nq_loyalty_words(string $locale, array $override = []): array
        {
            $en = [
                'points' => 'points',
                'pointsBalance' => 'Points balance',
                'member' => 'Member',
                'memberSince' => 'Member since {0}',
                'tier' => 'Tier',
                'toNext' => '{0} points to {1}',
                'topTier' => 'You are at the top tier',
                'expiring' => '{0} points expire on {1}',
                'memberCode' => 'Member code',
                'rewards' => 'Rewards',
                'claim' => 'Redeem',
                'noRewards' => 'No rewards yet',
                'history' => 'Points activity',
                'kinds' => [
                    'earn' => 'Earned',
                    'redeem' => 'Redeemed',
                    'expire' => 'Expired',
                    'adjust' => 'Adjusted',
                ],
                'balanceAfter' => 'Balance {0}',
                'noHistory' => 'No points activity',
                'noHistoryHint' => 'Points show here after the first visit.',
                'all' => 'All',
                'promoCode' => 'Promo code',
                'promoPlaceholder' => 'Enter a code',
                'apply' => 'Apply',
                'remove' => 'Remove code',
                'applied' => '{0} applied',
                'saves' => 'You save {0}',
                'failed' => 'That did not go through. Try again.',
                'problems' => [
                    'format' => 'A code is 3 to 24 letters or digits.',
                    'empty' => 'Enter a code.',
                    'unknown' => 'We do not know that code.',
                    'inactive' => 'This code is switched off.',
                    'not-started' => 'This code is not active yet.',
                    'expired' => 'This code has expired.',
                    'min-subtotal' => 'Your order is below the minimum for this code.',
                    'exhausted' => 'This code has been used up.',
                    'per-customer' => 'You have already used this code.',
                    'first-order' => 'This code is for a first order only.',
                ],
                'promos' => 'Promo codes',
                'newPromo' => 'New promo code',
                'editPromo' => 'Edit promo code',
                'code' => 'Code',
                'codeHint' => 'Letters, digits, dashes. Shown to customers exactly as typed, in capitals.',
                'type' => 'Type',
                'percent' => 'Percent off',
                'fixed' => 'Amount off',
                'value' => 'Value',
                'percentValue' => 'Percent',
                'maxDiscount' => 'Largest discount',
                'minSubtotal' => 'Smallest order',
                'startsOn' => 'Starts',
                'endsOn' => 'Ends',
                'maxRedemptions' => 'Total uses',
                'perCustomer' => 'Uses per customer',
                'unlimited' => 'Unlimited',
                'firstOrderOnly' => 'First order only',
                'active' => 'Active',
                'save' => 'Save code',
                'cancel' => 'Cancel',
                'discountCol' => 'Discount',
                'validity' => 'Valid',
                'usesCol' => 'Used',
                'statusCol' => 'Status',
                'search' => 'Search codes',
                'statuses' => [
                    'live' => 'Live',
                    'scheduled' => 'Scheduled',
                    'ended' => 'Ended',
                    'off' => 'Off',
                    'full' => 'Used up',
                ],
                'copyCode' => 'Copy code',
                'edit' => 'Edit',
                'deactivate' => 'Turn off',
                'activate' => 'Turn on',
                'delete' => 'Delete',
                'deleteTitle' => 'Delete this code?',
                'deleteDescription' => '{0} stops working. Past orders keep their discount.',
                'noPromos' => 'No promo codes',
                'noPromosHint' => 'Create a code to run an offer.',
                'promoLabel' => 'Promo codes',
                'visits' => 'Visits',
                'date' => 'Date',
                'place' => 'Place',
                'spend' => 'Spend',
                'earned' => 'Points',
                'visitStatus' => [
                    'completed' => 'Completed',
                    'no-show' => 'No show',
                    'cancelled' => 'Cancelled',
                ],
                'visitCount' => 'Visits',
                'totalSpend' => 'Total spend',
                'average' => 'Average visit',
                'lastVisit' => 'Last visit',
                'noVisits' => 'No visits yet',
                'noVisitsHint' => 'Visits show here after the first booking.',
                'visitLabel' => 'Visit history',
                'close' => 'Close',
                'actions' => 'Actions',
            ];
$ar = [
                'points' => 'نقطة',
                'pointsBalance' => 'رصيد النقاط',
                'member' => 'العضو',
                'memberSince' => 'عضو منذ {0}',
                'tier' => 'المستوى',
                'toNext' => '{0} نقطة للوصول إلى {1}',
                'topTier' => 'أنت في أعلى مستوى',
                'expiring' => '{0} نقطة تنتهي في {1}',
                'memberCode' => 'رمز العضوية',
                'rewards' => 'المكافآت',
                'claim' => 'استبدال',
                'noRewards' => 'لا توجد مكافآت بعد',
                'history' => 'نشاط النقاط',
                'kinds' => [
                    'earn' => 'مكتسبة',
                    'redeem' => 'مستبدلة',
                    'expire' => 'منتهية',
                    'adjust' => 'تعديل',
                ],
                'balanceAfter' => 'الرصيد {0}',
                'noHistory' => 'لا يوجد نشاط للنقاط',
                'noHistoryHint' => 'تظهر النقاط هنا بعد أول زيارة.',
                'all' => 'الكل',
                'promoCode' => 'كود الخصم',
                'promoPlaceholder' => 'أدخل الكود',
                'apply' => 'تطبيق',
                'remove' => 'إزالة الكود',
                'applied' => 'تم تطبيق {0}',
                'saves' => 'توفّر {0}',
                'failed' => 'لم تتم العملية. حاول مرة أخرى.',
                'problems' => [
                    'format' => 'الكود من 3 إلى 24 حرفًا أو رقمًا.',
                    'empty' => 'أدخل الكود.',
                    'unknown' => 'لا نعرف هذا الكود.',
                    'inactive' => 'هذا الكود متوقف.',
                    'not-started' => 'هذا الكود لم يبدأ بعد.',
                    'expired' => 'انتهت صلاحية هذا الكود.',
                    'min-subtotal' => 'طلبك أقل من الحد الأدنى لهذا الكود.',
                    'exhausted' => 'استُهلك هذا الكود بالكامل.',
                    'per-customer' => 'لقد استخدمت هذا الكود من قبل.',
                    'first-order' => 'هذا الكود للطلب الأول فقط.',
                ],
                'promos' => 'أكواد الخصم',
                'newPromo' => 'كود خصم جديد',
                'editPromo' => 'تعديل كود الخصم',
                'code' => 'الكود',
                'codeHint' => 'حروف وأرقام وشرطات. يظهر للعملاء كما كُتب، بأحرف كبيرة.',
                'type' => 'النوع',
                'percent' => 'نسبة خصم',
                'fixed' => 'مبلغ خصم',
                'value' => 'القيمة',
                'percentValue' => 'النسبة',
                'maxDiscount' => 'أقصى خصم',
                'minSubtotal' => 'أقل طلب',
                'startsOn' => 'يبدأ',
                'endsOn' => 'ينتهي',
                'maxRedemptions' => 'إجمالي الاستخدامات',
                'perCustomer' => 'الاستخدامات لكل عميل',
                'unlimited' => 'غير محدود',
                'firstOrderOnly' => 'الطلب الأول فقط',
                'active' => 'مفعّل',
                'save' => 'حفظ الكود',
                'cancel' => 'إلغاء',
                'discountCol' => 'الخصم',
                'validity' => 'الصلاحية',
                'usesCol' => 'الاستخدام',
                'statusCol' => 'الحالة',
                'search' => 'ابحث في الأكواد',
                'statuses' => [
                    'live' => 'ساري',
                    'scheduled' => 'مجدول',
                    'ended' => 'منتهٍ',
                    'off' => 'متوقف',
                    'full' => 'مستهلك',
                ],
                'copyCode' => 'نسخ الكود',
                'edit' => 'تعديل',
                'deactivate' => 'إيقاف',
                'activate' => 'تشغيل',
                'delete' => 'حذف',
                'deleteTitle' => 'حذف هذا الكود؟',
                'deleteDescription' => 'سيتوقف {0} عن العمل. الطلبات السابقة تحتفظ بخصمها.',
                'noPromos' => 'لا توجد أكواد خصم',
                'noPromosHint' => 'أنشئ كودًا لإطلاق عرض.',
                'promoLabel' => 'أكواد الخصم',
                'visits' => 'الزيارات',
                'date' => 'التاريخ',
                'place' => 'المكان',
                'spend' => 'الإنفاق',
                'earned' => 'النقاط',
                'visitStatus' => [
                    'completed' => 'مكتملة',
                    'no-show' => 'لم يحضر',
                    'cancelled' => 'ملغاة',
                ],
                'visitCount' => 'الزيارات',
                'totalSpend' => 'إجمالي الإنفاق',
                'average' => 'متوسط الزيارة',
                'lastVisit' => 'آخر زيارة',
                'noVisits' => 'لا توجد زيارات بعد',
                'noVisitsHint' => 'تظهر الزيارات هنا بعد أول حجز.',
                'visitLabel' => 'سجل الزيارات',
                'close' => 'إغلاق',
                'actions' => 'الإجراءات',
            ];

            $base = str_starts_with($locale, 'ar') ? $ar : $en;
            foreach ($override as $key => $value) {
                $base[$key] = is_array($value) && is_array($base[$key] ?? null) ? array_merge($base[$key], $value) : $value;
            }

            return $base;
        }

        /** Fills {0}, {1} in a word. */
        function nq_loyalty_say(string $text, string|int|float ...$args): string
        {
            foreach ($args as $i => $arg) {
                $text = str_replace('{'.$i.'}', (string) $arg, $text);
            }

            return $text;
        }

        /** A whole number with Latin digits and grouping in the locale. */
        function nq_loyalty_num(int|float $n, string $locale): string
        {
            if (class_exists(\NumberFormatter::class)) {
                $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::DECIMAL);
                $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, 2);

                return (string) $f->format($n);
            }

            return number_format($n, $n == (int) $n ? 0 : 2);
        }

        /** Minor units to the major amount for a currency (JPY has no decimals, KWD three). */
        function nq_loyalty_major(int|float $minor, string $currency): float
        {
            $digits = match (strtoupper($currency)) {
                'JPY', 'KRW', 'VND', 'CLP' => 0,
                'KWD', 'BHD', 'OMR', 'JOD', 'TND' => 3,
                default => 2,
            };

            return $minor / (10 ** $digits);
        }

        /** Where lifetime points put a customer: the tier held, the next one, points to go and the percentage through. */
        function nq_loyalty_tier(int|float $lifetime, array $tiers): array
        {
            usort($tiers, fn ($a, $b) => $a['minPoints'] <=> $b['minPoints']);
            $tier = null;
            foreach ($tiers as $t) {
                if ($lifetime >= $t['minPoints']) {
                    $tier = $t;
                }
            }
            $next = null;
            foreach ($tiers as $t) {
                if ($t['minPoints'] > $lifetime) {
                    $next = $t;
                    break;
                }
            }
            if (! $next) {
                return ['tier' => $tier, 'next' => null, 'toNext' => 0, 'progress' => 100];
            }
            $from = $tier['minPoints'] ?? 0;
            $span = $next['minPoints'] - $from;

            return ['tier' => $tier, 'next' => $next, 'toNext' => $next['minPoints'] - $lifetime, 'progress' => $span > 0 ? max(0, min(100, (int) floor((($lifetime - $from) / $span) * 100))) : 0];
        }

        /** Points that lapse within $within days of $asOf (inclusive), and the first day it happens. */
        function nq_loyalty_expiring(array $lots, string $asOf, int $within): array
        {
            $today = strtotime($asOf.' 12:00:00 UTC');
            $points = 0;
            $on = null;
            foreach ($lots as $lot) {
                $exp = $lot['expiresOn'] ?? null;
                if (! $exp || ($lot['points'] ?? 0) <= 0) {
                    continue;
                }
                $left = (int) round((strtotime($exp.' 12:00:00 UTC') - $today) / 86400);
                if ($left < 0 || $left > $within) {
                    continue;
                }
                $points += $lot['points'];
                if ($on === null || $exp < $on) {
                    $on = $exp;
                }
            }

            return ['points' => $points, 'on' => $on];
        }

        /** live | scheduled | ended | off | full: where a promo code stands on a day. */
        function nq_loyalty_standing(array $p, string $today): string
        {
            if (($p['active'] ?? true) === false) {
                return 'off';
            }
            if (! empty($p['endsOn']) && $today > $p['endsOn']) {
                return 'ended';
            }
            if (! empty($p['startsOn']) && $today < $p['startsOn']) {
                return 'scheduled';
            }
            if (isset($p['maxRedemptions']) && ($p['used'] ?? 0) >= $p['maxRedemptions']) {
                return 'full';
            }

            return 'live';
        }
    }
@endphp
