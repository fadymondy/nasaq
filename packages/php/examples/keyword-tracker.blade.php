@php
    $keywords = [
        ['id' => 'k1', 'keyword' => 'rtl react components', 'position' => 4, 'previousPosition' => 7, 'history' => [9, 8, 7, 7, 5, 4], 'url' => '/components', 'volume' => 2400, 'difficulty' => 38, 'features' => ['snippet', 'paa']],
        ['id' => 'k2', 'keyword' => 'arabic design system', 'position' => 2, 'previousPosition' => 2, 'history' => [3, 3, 2, 2, 2, 2], 'url' => '/design-system', 'volume' => 1900, 'difficulty' => 45, 'features' => ['sitelinks']],
        ['id' => 'k3', 'keyword' => 'nasaq ui', 'position' => 1, 'previousPosition' => 1, 'history' => [1, 1, 1, 1, 1, 1], 'url' => '/', 'volume' => 600, 'difficulty' => 12],
        ['id' => 'k4', 'keyword' => 'react rtl library', 'position' => 12, 'previousPosition' => 9, 'history' => [8, 9, 9, 10, 9, 12], 'url' => '/blog/rtl', 'volume' => 1300, 'difficulty' => 52, 'features' => ['images']],
        ['id' => 'k5', 'keyword' => 'ui kit arabic', 'position' => null, 'previousPosition' => 34, 'volume' => 800, 'difficulty' => 64],
        ['id' => 'k6', 'keyword' => 'design tokens guide', 'position' => 18, 'previousPosition' => null, 'url' => '/docs/tokens', 'volume' => 4400, 'difficulty' => 71, 'features' => ['video']],
    ];
    $history = [
        ['date' => '2026-09-23', 'position' => 9.2, 'top10' => 2],
        ['date' => '2026-09-24', 'position' => 8.8, 'top10' => 2],
        ['date' => '2026-09-25', 'position' => 8.4, 'top10' => 3],
        ['date' => '2026-09-26', 'position' => 8.1, 'top10' => 3],
        ['date' => '2026-09-27', 'position' => 7.8, 'top10' => 3],
        ['date' => '2026-09-28', 'position' => 7.6, 'top10' => 3],
        ['date' => '2026-09-29', 'position' => 7.4, 'top10' => 3],
    ];
@endphp
<x-nq::keyword-tracker :keywords="$keywords" :position-history="$history"
    :locations="[['value' => 'sa', 'label' => 'Saudi Arabia'], ['value' => 'ae', 'label' => 'United Arab Emirates']]"
    :competitors="[
        ['id' => 'c1', 'domain' => 'nasaq.dev', 'you' => true, 'ranks' => ['k1' => 4, 'k2' => 2, 'k3' => 1, 'k4' => 12, 'k5' => null, 'k6' => 18]],
        ['id' => 'c2', 'domain' => 'rtlkit.io', 'ranks' => ['k1' => 3, 'k2' => 8, 'k3' => null, 'k4' => 5, 'k5' => 11, 'k6' => null]],
    ]"
    x-on:add-keywords="$event.detail.wait(Promise.resolve())"
    x-on:remove-keywords="$event.detail.wait(Promise.resolve())"
    x-on:refresh-keywords="$event.detail.wait(Promise.resolve())"
    x-on:update-keyword="$event.detail.wait(Promise.resolve())" />
