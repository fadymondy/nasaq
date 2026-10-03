{{-- Internal: the words and pure figures behind the store dashboard, ported from store-dashboard strings.ts and store-dashboard-math.ts
     (plus the minor-unit and low-stock helpers of lib/commerce.ts it uses). Included with @include('nasaq::components.store-dashboard._logic'); every function is defined once.
     Money is integer minor units. Ratios are fractions. --}}
@include('nasaq::components.business-reports._logic')
@php
    if (! function_exists('nq_sd_words')) {
        /** The dashboard's own words for a locale, with the host's overrides on top. */
        function nq_sd_words(string $locale, array $override = []): array
        {
            $en = [
                    'region' => 'Store dashboard',
                    'kpis' => 'Key figures',
                    'sales' => 'Sales',
                    'orders' => 'Orders',
                    'aov' => 'Average order value',
                    'conversion' => 'Conversion rate',
                    'returning' => 'Returning customers',
                    'live' => 'Live visitors',
                    'liveHint' => 'on the site right now',
                    'liveBadge' => 'Live',
                    'vsPrevious' => 'vs previous period',
                    'salesSpark' => '%s, trend over the period',
                    'widgets' => [
                        'sales' => 'Sales over time',
                        'funnel' => 'Conversion funnel',
                        'topProducts' => 'Top products',
                        'categories' => 'Top categories',
                        'channels' => 'Sales by channel',
                        'cities' => 'Sales by city',
                        'lowStock' => 'Low stock',
                        'recentOrders' => 'Recent orders',
                    ],
                    'widgetHints' => [
                        'sales' => 'Sales, orders and sessions with the previous period behind them',
                        'funnel' => 'Sessions to purchase, and where shoppers leave',
                        'topProducts' => 'Best sellers by revenue',
                        'categories' => 'Revenue by product category',
                        'channels' => 'Where the sales came from',
                        'cities' => 'Where the orders were delivered',
                        'lowStock' => 'Variants at or under the stock threshold',
                        'recentOrders' => 'The latest orders placed',
                    ],
                    'metrics' => [
                        'sales' => 'Sales',
                        'orders' => 'Orders',
                        'sessions' => 'Sessions',
                    ],
                    'funnelSteps' => [
                        'sessions' => 'Sessions',
                        'addToCart' => 'Added to cart',
                        'checkout' => 'Started checkout',
                        'purchase' => 'Purchased',
                    ],
                    'dimension' => [
                        'category' => 'Category',
                        'channel' => 'Channel',
                        'city' => 'City',
                    ],
                    'revenue' => 'Revenue',
                    'outOfStock' => 'Out of stock',
                    'leftOne' => '1 left', 'leftMany' => '%d left',
                    'restock' => 'Restock',
                    'restockItem' => 'Restock %s',
                    'openProduct' => 'Open product',
                    'openOrder' => 'Open order',
                    'noLowStock' => 'Every variant is well stocked',
                    'noLowStockHint' => 'Nothing at %d or fewer.',
                    'noOrders' => 'No orders yet',
                    'noRows' => 'No data for this period',
                    'order' => 'Order',
                    'customer' => 'Customer',
                    'status' => 'Status',
                    'total' => 'Total',
                    'placed' => 'Placed',
                    'ordersTable' => 'Recent orders',
                    'orderStatus' => [
                        'pending' => 'Pending',
                        'paid' => 'Paid',
                        'processing' => 'Processing',
                        'partially-fulfilled' => 'Partly fulfilled',
                        'fulfilled' => 'Fulfilled',
                        'shipped' => 'Shipped',
                        'out-for-delivery' => 'Out for delivery',
                        'delivered' => 'Delivered',
                        'cancelled' => 'Cancelled',
                        'refunded' => 'Refunded',
                        'partially-refunded' => 'Partly refunded',
                        'returned' => 'Returned',
                    ],
                    'emptyTitle' => 'No sales in this period',
                    'emptyBody' => 'When customers start ordering, your figures, top sellers and funnel show up here.',
                    'errorTitle' => 'The dashboard could not be loaded.',
                    'retry' => 'Try again',
                    'productImage' => 'No image',
                    'unitsMany' => '%d sold',
                    'unitsOne' => '1 sold',
                ];
            $ar = [
                    'region' => 'لوحة المتجر',
                    'kpis' => 'الأرقام الرئيسية',
                    'sales' => 'المبيعات',
                    'orders' => 'الطلبات',
                    'aov' => 'متوسط قيمة الطلب',
                    'conversion' => 'معدل التحويل',
                    'returning' => 'العملاء العائدون',
                    'live' => 'الزوار الآن',
                    'liveHint' => 'على المتجر في هذه اللحظة',
                    'liveBadge' => 'مباشر',
                    'vsPrevious' => 'مقارنة بالفترة السابقة',
                    'salesSpark' => '%s، الاتجاه خلال الفترة',
                    'widgets' => [
                        'sales' => 'المبيعات عبر الزمن',
                        'funnel' => 'قمع التحويل',
                        'topProducts' => 'أفضل المنتجات',
                        'categories' => 'أفضل الأقسام',
                        'channels' => 'المبيعات حسب القناة',
                        'cities' => 'المبيعات حسب المدينة',
                        'lowStock' => 'مخزون منخفض',
                        'recentOrders' => 'أحدث الطلبات',
                    ],
                    'widgetHints' => [
                        'sales' => 'المبيعات والطلبات والجلسات مع الفترة السابقة خلفها',
                        'funnel' => 'من الزيارة إلى الشراء، وأين يغادر المتسوقون',
                        'topProducts' => 'الأكثر مبيعًا حسب الإيراد',
                        'categories' => 'الإيراد حسب قسم المنتج',
                        'channels' => 'من أين جاءت المبيعات',
                        'cities' => 'إلى أين وصلت الطلبات',
                        'lowStock' => 'الأصناف التي وصلت إلى حد المخزون أو أقل',
                        'recentOrders' => 'آخر الطلبات الواردة',
                    ],
                    'metrics' => [
                        'sales' => 'المبيعات',
                        'orders' => 'الطلبات',
                        'sessions' => 'الجلسات',
                    ],
                    'funnelSteps' => [
                        'sessions' => 'الجلسات',
                        'addToCart' => 'أضافوا إلى السلة',
                        'checkout' => 'بدأوا الدفع',
                        'purchase' => 'أتمّوا الشراء',
                    ],
                    'dimension' => [
                        'category' => 'القسم',
                        'channel' => 'القناة',
                        'city' => 'المدينة',
                    ],
                    'revenue' => 'الإيراد',
                    'outOfStock' => 'نفد المخزون',
                    'leftOne' => 'بقيت قطعة', 'leftTwo' => 'بقيت قطعتان', 'leftMany' => 'بقيت %d قطع',
                    'restock' => 'إعادة التوريد',
                    'restockItem' => 'إعادة توريد %s',
                    'openProduct' => 'فتح المنتج',
                    'openOrder' => 'فتح الطلب',
                    'noLowStock' => 'كل الأصناف بمخزون جيد',
                    'noLowStockHint' => 'لا شيء عند %d أو أقل.',
                    'noOrders' => 'لا توجد طلبات بعد',
                    'noRows' => 'لا بيانات لهذه الفترة',
                    'order' => 'الطلب',
                    'customer' => 'العميل',
                    'status' => 'الحالة',
                    'total' => 'الإجمالي',
                    'placed' => 'وقت الطلب',
                    'ordersTable' => 'أحدث الطلبات',
                    'orderStatus' => [
                        'pending' => 'قيد الانتظار',
                        'paid' => 'مدفوع',
                        'processing' => 'قيد التجهيز',
                        'partially-fulfilled' => 'منفّذ جزئيًا',
                        'fulfilled' => 'تم التجهيز',
                        'shipped' => 'تم الشحن',
                        'out-for-delivery' => 'خرج للتوصيل',
                        'delivered' => 'تم التسليم',
                        'cancelled' => 'ملغي',
                        'refunded' => 'مُسترد',
                        'partially-refunded' => 'مُسترد جزئيًا',
                        'returned' => 'مُرتجع',
                    ],
                    'emptyTitle' => 'لا مبيعات في هذه الفترة',
                    'emptyBody' => 'عندما يبدأ العملاء بالطلب ستظهر هنا أرقامك وأكثر المنتجات مبيعًا وقمع التحويل.',
                    'errorTitle' => 'تعذّر تحميل اللوحة.',
                    'retry' => 'حاول مرة أخرى',
                    'productImage' => 'بلا صورة',
                    'unitsMany' => 'بيعت %d قطع', 'unitsTwo' => 'بيعت قطعتان', 'unitsOther' => 'بيعت %d قطعة',
                    'unitsOne' => 'بيعت قطعة',
                ];
            $variant = [
                    'pending' => 'warning',
                    'paid' => 'info',
                    'processing' => 'info',
                    'partially-fulfilled' => 'info',
                    'fulfilled' => 'success',
                    'shipped' => 'info',
                    'out-for-delivery' => 'info',
                    'delivered' => 'success',
                    'cancelled' => 'danger',
                    'refunded' => 'neutral',
                    'partially-refunded' => 'neutral',
                    'returned' => 'neutral',
                ];
            $t = str_starts_with($locale, 'ar') ? $ar : $en;
            $t['variant'] = $variant;

            return array_replace_recursive($t, $override);
        }

        /** "120 sold" / "1 sold" (Arabic has one, two, few and many forms). */
        function nq_sd_units(array $t, int $n): string
        {
            if ($n === 1) {
                return $t['unitsOne'];
            }
            if (isset($t['unitsTwo']) && $n === 2) {
                return $t['unitsTwo'];
            }
            if (isset($t['unitsOther'])) {
                return sprintf($n <= 10 ? $t['unitsMany'] : $t['unitsOther'], $n);
            }

            return sprintf($t['unitsMany'], $n);
        }

        /** "5 left" / "1 left". */
        function nq_sd_left(array $t, int $n): string
        {
            if ($n === 1) {
                return $t['leftOne'];
            }
            if (isset($t['leftTwo']) && $n === 2) {
                return $t['leftTwo'];
            }

            return sprintf($t['leftMany'], $n);
        }

        function nq_sd_divide(float|int $a, float|int $b, float|int $fallback = 0): float|int
        {
            return $b == 0 ? $fallback : $a / $b;
        }

        /** Change as a fraction (0.124 is +12.4%), or null when there is nothing to compare. */
        function nq_sd_change(float|int $current, float|int|null $previous): ?float
        {
            if ($previous === null) {
                return null;
            }
            if ($previous == 0) {
                return $current == 0 ? 0.0 : null;
            }

            return ($current - $previous) / abs($previous);
        }

        /** Minor units per major unit for an ISO currency (100 for USD and SAR, 1 for JPY, 1000 for KWD). */
        function nq_sd_factor(string $currency): int
        {
            static $zero = ['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
            static $three = ['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'];
            $code = strtoupper($currency);

            return in_array($code, $zero, true) ? 1 : (in_array($code, $three, true) ? 1000 : 100);
        }

        function nq_sd_major(float|int $minor, string $currency): float
        {
            return $minor / nq_sd_factor($currency);
        }

        /** The five headline KPIs: ['sales' => ['value', 'change'], ...]. */
        function nq_sd_kpis(array $cur, ?array $prev): array
        {
            $aov = fn ($t) => (int) round(nq_sd_divide($t['sales'] ?? 0, $t['orders'] ?? 0));
            $conv = fn ($t) => min(1, max(0, nq_sd_divide($t['orders'] ?? 0, $t['sessions'] ?? 0)));
            $ret = fn ($t) => min(1, max(0, nq_sd_divide($t['returningCustomers'] ?? 0, $t['customers'] ?? 0)));
            $k = fn ($v, $p) => ['value' => $v, 'change' => nq_sd_change($v, $p)];

            return [
                'sales' => $k($cur['sales'] ?? 0, $prev ? ($prev['sales'] ?? 0) : null),
                'orders' => $k($cur['orders'] ?? 0, $prev ? ($prev['orders'] ?? 0) : null),
                'aov' => $k($aov($cur), $prev ? $aov($prev) : null),
                'conversion' => $k($conv($cur), $prev ? $conv($prev) : null),
                'returning' => $k($ret($cur), $prev ? $ret($prev) : null),
            ];
        }

        /** Sessions, add to cart, checkout, purchase; each step capped by the one before it. */
        function nq_sd_funnel(array $totals): array
        {
            $clean = fn ($n) => max(0, (int) floor(is_numeric($n) ? $n : 0));
            $sessions = $clean($totals['sessions'] ?? 0);
            $cart = min($sessions, $clean($totals['addToCart'] ?? 0));
            $checkout = min($cart, $clean($totals['checkouts'] ?? 0));

            return ['sessions' => $sessions, 'addToCart' => $cart, 'checkout' => $checkout, 'purchase' => min($checkout, $clean($totals['orders'] ?? 0))];
        }

        /** The n largest rows by $key, ties kept in input order. */
        function nq_sd_top(array $rows, int $n, string $key = 'value'): array
        {
            $rows = array_values($rows);
            $idx = array_keys($rows);
            usort($idx, fn ($a, $b) => ($rows[$b][$key] <=> $rows[$a][$key]) ?: $a <=> $b);

            return array_map(fn ($i) => $rows[$i], array_slice($idx, 0, max(0, $n)));
        }

        /** Variants at or under the threshold, out of stock first, then the lowest. Non-active products and untracked variants are skipped. */
        function nq_sd_low_stock(array $products, int $threshold = 5): array
        {
            $out = [];
            foreach ($products as $p) {
                if (! empty($p['status']) && $p['status'] !== 'active') {
                    continue;
                }
                foreach ($p['variants'] ?? [] as $v) {
                    if (! isset($v['stock']) || ! is_numeric($v['stock']) || $v['stock'] > $threshold) {
                        continue;
                    }
                    $label = [];
                    foreach ($p['options'] ?? [] as $o) {
                        foreach ($o['values'] ?? [] as $x) {
                            if (($x['id'] ?? null) === ($v['options'][$o['id']] ?? null)) {
                                $label[] = $x['label'];
                                break;
                            }
                        }
                    }
                    $out[] = [
                        'productId' => $p['id'], 'productName' => $p['name'], 'variantId' => $v['id'], 'sku' => $v['sku'] ?? null,
                        'variantLabel' => implode(' / ', $label), 'stock' => max(0, (int) $v['stock']), 'level' => $v['stock'] <= 0 ? 'out' : 'low',
                        'image' => $v['image'] ?? ($p['images'][0]['src'] ?? null),
                    ];
                }
            }
            usort($out, fn ($a, $b) => ($a['stock'] <=> $b['stock']) ?: strcmp($a['productName'], $b['productName']) ?: strcmp($a['variantId'], $b['variantId']));

            return $out;
        }
    }
@endphp
