{{-- Internal: the built-in strings shared by the catalog-store parts (port of catalog-store.tsx).
     Included with @include('nasaq::components.catalog-store._strings'); the functions are defined once.
     Templates take :n (a count) and :p (a publisher). --}}
@php
    if (! function_exists('nq_catalog_labels')) {
        /** The built-in strings (Arabic under an Arabic locale) with any overrides on top. */
        function nq_catalog_labels(array $override = [], ?string $locale = null): array
        {
            $strings = [
                'en' => [
                    'search' => 'Search the store', 'all' => 'All', 'installed' => 'Installed', 'categories' => 'Categories', 'sort' => 'Sort by',
                    'sortPopular' => 'Popular', 'sortNewest' => 'Newest', 'sortName' => 'A to Z', 'results' => ':n results',
                    'emptyTitle' => 'Nothing found', 'emptyBody' => 'Try another word or pick a different category.', 'clear' => 'Clear filters',
                    'by' => 'by :p', 'installs' => 'installs', 'about' => 'About', 'tags' => 'Tags', 'version' => 'Version', 'updated' => 'Updated',
                    'uninstall' => 'Uninstall', 'uninstalling' => 'Removing', 'details' => 'Details', 'free' => 'Free', 'installedNote' => 'Installed in this workspace.',
                ],
                'ar' => [
                    'search' => 'ابحث في المتجر', 'all' => 'الكل', 'installed' => 'المثبّتة', 'categories' => 'الفئات', 'sort' => 'الترتيب',
                    'sortPopular' => 'الأشهر', 'sortNewest' => 'الأحدث', 'sortName' => 'أبجديًا', 'results' => ':n نتيجة',
                    'emptyTitle' => 'لا شيء هنا', 'emptyBody' => 'جرّب كلمة أخرى أو اختر فئة مختلفة.', 'clear' => 'مسح التصفية',
                    'by' => 'من :p', 'installs' => 'تثبيت', 'about' => 'نبذة', 'tags' => 'الوسوم', 'version' => 'الإصدار', 'updated' => 'آخر تحديث',
                    'uninstall' => 'إزالة', 'uninstalling' => 'جارٍ الإزالة', 'details' => 'التفاصيل', 'free' => 'مجاني', 'installedNote' => 'مثبّت في مساحة العمل هذه.',
                ],
            ];

            return array_merge($strings[\Nasaq\Nasaq::rtl($locale) ? 'ar' : 'en'], $override);
        }
    }
    if (! function_exists('nq_catalog_compact')) {
        /** 1200 -> 1.2K, 9000 -> 9K (Latin digits, like the Vue port's compact notation). */
        function nq_catalog_compact(int|float $n): string
        {
            $abs = abs($n);
            [$div, $suffix] = $abs >= 1e9 ? [1e9, 'B'] : ($abs >= 1e6 ? [1e6, 'M'] : ($abs >= 1e3 ? [1e3, 'K'] : [1, '']));
            $scaled = $n / $div;

            return rtrim(rtrim(number_format($abs >= 1e3 && abs($scaled) < 10 ? round($scaled, 1) : round($scaled), 1, '.', ''), '0'), '.').$suffix;
        }
    }
@endphp
