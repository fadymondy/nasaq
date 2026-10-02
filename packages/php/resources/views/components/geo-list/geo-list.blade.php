{{-- <x-nq::geo-list value-label="Users" :rows="[['code' => 'SA', 'value' => 12400, 'previous' => 11200], ['code' => 'EG', 'value' => 8100, 'previous' => 8600]]" />
     Visitors or clicks by country: a flag, the country name in the reader's language, a bar, the figure, its share and the change. Built on
     <x-nq::breakdown-table>. rows: ['code' => ISO 3166-1 alpha-2 ("SA"), 'value', 'previous'] - anything else shows as Unknown; the name is localised for you.
     value-label: heading of the value column. title / description: card header (default "Countries"). format, limit (default 8), invert, color, loading:
     as in breakdown-table. labels: array overriding country, unknown, title; labels['table'] overrides the breakdown-table words. Needs the Alpine
     runtime for Show all (@nasaqScripts). The flag is emoji text placed before the name in the label. --}}
@props(['rows' => [], 'valueLabel' => '', 'title' => null, 'description' => null, 'format' => [], 'limit' => 8, 'invert' => false, 'color' => 'var(--primary)', 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? ['country' => 'الدولة', 'unknown' => 'غير معروفة', 'title' => 'الدول'] : ['country' => 'Country', 'unknown' => 'Unknown', 'title' => 'Countries'], array_diff_key($labels, ['table' => 1]));
    $tableRows = [];
    foreach ($rows as $r) {
        $code = strtoupper((string) $r['code']);
        $flag = preg_match('/^[A-Z]{2}$/', $code) === 1 ? mb_chr(0x1F1E6 + ord($code[0]) - 65).mb_chr(0x1F1E6 + ord($code[1]) - 65) : '';
        $name = $code;
        if ($flag !== '' && class_exists(\Locale::class)) {
            $name = \Locale::getDisplayRegion('-'.$code, $locale) ?: $code;
        }
        $tableRows[] = [
            'id' => $r['code'],
            'value' => $r['value'],
            'previous' => $r['previous'] ?? null,
            'label' => $flag !== '' ? $flag.' '.$name : $t['unknown'],
        ];
    }
@endphp
<x-nq::breakdown-table
    :title="$title ?? $t['title']"
    :description="$description"
    :dimension-label="$t['country']"
    :value-label="$valueLabel"
    :format="$format"
    :limit="$limit"
    :invert="$invert"
    :color="$color"
    :loading="$loading"
    :labels="$labels['table'] ?? []"
    :locale="$locale"
    :rows="$tableRows"
    :attributes="$attributes" />
