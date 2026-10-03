{{-- <x-nq::search-console-page :service="$service" :data="$data" site="nasaq.dev" :period="28" refreshable />
     The Google Search Console report: clicks, impressions, CTR and average position tiles with comparison, a chart the tiles drive (choose a tile to chart it),
     and tabs for queries, pages, countries and devices. Until the service is connected it shows the connect screen.
     service: ['id', 'name', 'status' => 'connected', 'connectedAs', 'scopes' => [...], 'accounts', 'accountId']. data: ['summary' => ['clicks'|'impressions'|'ctr'|
     'position' => ['value', 'previous', 'trend']] (ctr is a fraction, 0.034), 'series' => [['date', 'clicks', 'impressions', 'ctr', 'position']], 'previousSeries',
     'queries', 'pages' (['id', 'label', 'clicks', 'impressions', 'position', 'previousClicks', 'previousPosition']), 'countries' => [['code', 'value', 'previous']],
     'devices' => [['id', 'label', 'value', 'previous']]]; without it the page shows skeletons. site: for the subtitle (default the chosen account).
     period: the window in days (default 28); the toggle in the header is an x-modelable toggle group (its value is an array holding the days as a string).
     row-click: rows of the tables are activatable (the table's own events). loading, error (replaces the report), retryable, refreshable, refreshing, updated-at,
     labels, frame-labels. Events as in analytics-connect.page-frame: nq-refresh, nq-retry, nq-disconnect, nq-connect, nq-select-account, each with
     detail.wait(promise). Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.metric-tiles._logic')
@props(['service', 'data' => null, 'site' => null, 'period' => 28, 'rowClick' => false, 'loading' => false, 'error' => null, 'retryable' => false,
    'refreshable' => false, 'refreshing' => false, 'updatedAt' => null, 'labels' => [], 'frameLabels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'title' => 'Search Console', 'description' => 'أداء %s في بحث Google', 'clicks' => 'إجمالي النقرات', 'impressions' => 'إجمالي مرات الظهور',
        'ctr' => 'متوسط نسبة النقر', 'position' => 'متوسط الترتيب', 'chartTitle' => 'الأداء',
        'chartDescription' => 'اختر بطاقة لعرضها في الرسم. يتحسن متوسط الترتيب كلما قلّ الرقم.', 'tabQueries' => 'عبارات البحث', 'tabPages' => 'الصفحات',
        'tabCountries' => 'الدول', 'tabDevices' => 'الأجهزة', 'countries' => 'الدول', 'devices' => 'الأجهزة', 'device' => 'الجهاز', 'clicksShort' => 'النقرات',
        'benefits' => ['النقرات ومرات الظهور ونسبة النقر ومتوسط الترتيب', 'عبارات البحث والصفحات التي تجلب الزوار', 'الدول والأجهزة'],
    ] : [
        'title' => 'Search Console', 'description' => 'How %s performs in Google Search', 'clicks' => 'Total clicks', 'impressions' => 'Total impressions',
        'ctr' => 'Average CTR', 'position' => 'Average position', 'chartTitle' => 'Performance',
        'chartDescription' => 'Select a tile to chart it. Average position improves as it gets lower.', 'tabQueries' => 'Queries', 'tabPages' => 'Pages',
        'tabCountries' => 'Countries', 'tabDevices' => 'Devices', 'countries' => 'Countries', 'devices' => 'Devices', 'device' => 'Device', 'clicksShort' => 'Clicks',
        'benefits' => ['Clicks, impressions, CTR and average position', 'The queries and pages that bring searchers', 'Countries and devices'],
    ], (array) $labels);
    $accounts = (array) ($service['accounts'] ?? []);
    $accountName = null;
    foreach ($accounts as $a) {
        if (($a['id'] ?? null) === ($service['accountId'] ?? null)) {
            $accountName = $a['name'] ?? null;
        }
    }
    $accountName ??= $accounts[0]['name'] ?? null;
    $siteName = $site ?? $accountName;
    $busy = $loading || $data === null;
    $pct = ['style' => 'percent', 'maxFraction' => 1];
    $one = ['maxFraction' => 1];
    $s = $data['summary'] ?? null;
    $tile = fn (string $id, string $label, array $total, array $extra) => array_merge(['id' => $id, 'label' => $label, 'value' => $total['value'], 'previous' => $total['previous'] ?? null, 'sparkline' => $total['trend'] ?? null], $extra);
    $tiles = $s ? [
        $tile('clicks', $t['clicks'], $s['clicks'], ['icon' => 'mouse-pointer-click']),
        $tile('impressions', $t['impressions'], $s['impressions'], ['icon' => 'eye']),
        $tile('ctr', $t['ctr'], $s['ctr'], ['format' => $pct, 'icon' => 'percent']),
        $tile('position', $t['position'], $s['position'], ['format' => $one, 'invert' => true, 'icon' => 'trending-up']),
    ] : [];
    $metrics = [
        ['id' => 'clicks', 'label' => $t['clicks'], 'color' => 'var(--primary)'],
        ['id' => 'impressions', 'label' => $t['impressions'], 'color' => 'var(--nq-tag-purple)'],
        ['id' => 'ctr', 'label' => $t['ctr'], 'format' => $pct, 'aggregate' => 'avg', 'color' => 'var(--nq-tag-teal)'],
        ['id' => 'position', 'label' => $t['position'], 'format' => $one, 'aggregate' => 'avg', 'lowerIsBetter' => true, 'color' => 'var(--nq-tag-orange)'],
    ];
@endphp
<x-nq::analytics-connect.page-frame :title="$t['title']" :description="$siteName ? sprintf($t['description'], $siteName) : null" :service="$service" :benefits="$t['benefits']" :error="$error"
    :retryable="$retryable" :refreshable="$refreshable" :refreshing="$refreshing" :updated-at="$updatedAt" :labels="$frameLabels" :attributes="$attributes">
    <x-slot:actions>
        <x-nq::time-series-panel.period-toggle :value="$period" :locale="$locale" data-slot="period-toggle" />
    </x-slot:actions>
    <div class="contents" x-data="nqSearchConsolePage">
        <x-nq::metric-tiles :metrics="$tiles" selectable selected="clicks" :loading="$busy" :locale="$locale" />
        <x-nq::time-series-panel :title="$t['chartTitle']" :description="$t['chartDescription']" :metrics="$metrics" :data="$data['series'] ?? []"
            :previous-data="$data['previousSeries'] ?? []" metric="clicks" :loading="$busy" :locale="$locale" />
    </div>
    <x-nq::tabs default-value="queries">
        <x-nq::tabs.list variant="underline">
            <x-nq::tabs.tab value="queries">{{ $t['tabQueries'] }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="pages">{{ $t['tabPages'] }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="countries">{{ $t['tabCountries'] }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="devices">{{ $t['tabDevices'] }}</x-nq::tabs.tab>
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>
        <x-nq::tabs.panel value="queries">
            <x-nq::search-performance-table kind="query" :rows="$data['queries'] ?? []" :row-click="$rowClick" :loading="$busy" :locale="$locale" />
        </x-nq::tabs.panel>
        <x-nq::tabs.panel value="pages">
            <x-nq::search-performance-table kind="page" :rows="$data['pages'] ?? []" :row-click="$rowClick" :loading="$busy" :locale="$locale" />
        </x-nq::tabs.panel>
        <x-nq::tabs.panel value="countries">
            <x-nq::geo-list :title="$t['countries']" :value-label="$t['clicksShort']" :rows="$data['countries'] ?? []" :limit="10" :loading="$busy" :locale="$locale" />
        </x-nq::tabs.panel>
        <x-nq::tabs.panel value="devices">
            <x-nq::breakdown-table :title="$t['devices']" :dimension-label="$t['device']" :value-label="$t['clicksShort']" :rows="$data['devices'] ?? []" :loading="$busy" :locale="$locale" />
        </x-nq::tabs.panel>
    </x-nq::tabs>
</x-nq::analytics-connect.page-frame>
