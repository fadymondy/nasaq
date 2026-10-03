{{-- <x-nq::youtube-channel-page :service="$service" :data="$data" :period="28" refreshable />
     The YouTube channel report: views, watch time, net subscribers and average view duration tiles with comparison, a chart the tiles drive (choose a tile
     to chart it), and tabs for top videos, traffic sources and audience. Until the service is connected it shows the connect screen.
     service: ['id', 'name', 'status' => 'connected', 'connectedAs', 'scopes' => [...]]. data: ['channel' => ['name', 'handle', 'subscribers'], 'summary' =>
     ['views'|'watchHours'|'subscribers'|'avgSeconds' => ['value', 'previous', 'trend']] (watch time in hours, duration in seconds), 'series' => [['date', 'views',
     'watchHours', 'subscribers']], 'previousSeries', 'videos' => [['id', 'title', 'views', 'previousViews', 'watchHours', 'avgSeconds', 'href']],
     'trafficSources' => [['id', 'label', 'value', 'previous']], 'countries' => [['code', 'value', 'previous']]]; without it the page shows skeletons.
     period: the window in days (default 28); the toggle in the header is an x-modelable toggle group (its value is an array holding the days as a string).
     loading, error (replaces the report), retryable, refreshable, refreshing, updated-at, labels, frame-labels. Events as in analytics-connect.page-frame:
     nq-refresh, nq-retry, nq-disconnect, nq-connect, nq-select-account, each with detail.wait(promise). Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.metric-tiles._logic')
@props(['service', 'data' => null, 'period' => 28, 'loading' => false, 'error' => null, 'retryable' => false,
    'refreshable' => false, 'refreshing' => false, 'updatedAt' => null, 'labels' => [], 'frameLabels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'title' => 'YouTube', 'description' => '%s · %s مشترك', 'views' => 'المشاهدات', 'watchTime' => 'وقت المشاهدة (ساعات)', 'subscribers' => 'صافي المشتركين',
        'avgDuration' => 'متوسط مدة المشاهدة', 'chartTitle' => 'أداء القناة', 'chartDescription' => 'اختر بطاقة لعرضها في الرسم', 'tabVideos' => 'أفضل الفيديوهات',
        'tabTraffic' => 'مصادر الزيارات', 'tabAudience' => 'الجمهور', 'video' => 'الفيديو', 'watch' => 'وقت المشاهدة', 'avgView' => 'متوسط المدة',
        'trafficSources' => 'كيف وصل المشاهدون إليك', 'source' => 'المصدر', 'countries' => 'الدول',
        'benefits' => ['المشاهدات ووقت المشاهدة والمشتركون مقارنة بالفترة السابقة', 'أفضل فيديوهاتك', 'من أين يأتي المشاهدون'],
    ] : [
        'title' => 'YouTube', 'description' => '%s · %s subscribers', 'views' => 'Views', 'watchTime' => 'Watch time (hours)', 'subscribers' => 'Net subscribers',
        'avgDuration' => 'Avg. view duration', 'chartTitle' => 'Channel performance', 'chartDescription' => 'Select a tile to chart it', 'tabVideos' => 'Top videos',
        'tabTraffic' => 'Traffic sources', 'tabAudience' => 'Audience', 'video' => 'Video', 'watch' => 'Watch time', 'avgView' => 'Avg. duration',
        'trafficSources' => 'How viewers found you', 'source' => 'Source', 'countries' => 'Countries',
        'benefits' => ['Views, watch time and subscribers against the previous period', 'Your best videos', 'Where viewers come from'],
    ], (array) $labels);
    $seconds = function (int|float $total) use ($ar): string {
        $s = max(0, (int) round($total));
        $h = intdiv($s, 3600);
        $m = intdiv($s % 3600, 60);
        $u = $ar ? ['h' => 'س', 'm' => 'د', 's' => 'ث'] : ['h' => 'h', 'm' => 'm', 's' => 's'];
        if ($h > 0) {
            return $h.$u['h'].' '.str_pad((string) $m, 2, '0', STR_PAD_LEFT).$u['m'];
        }
        if ($m > 0) {
            return $m.$u['m'].' '.str_pad((string) ($s % 60), 2, '0', STR_PAD_LEFT).$u['s'];
        }

        return $s.$u['s'];
    };
    $compact = function (int|float $n) use ($ar, $locale): string {
        [$div, $unit] = $n >= 1e9 ? [1e9, $ar ? ' مليار' : 'B'] : ($n >= 1e6 ? [1e6, $ar ? ' مليون' : 'M'] : ($n >= 1e3 ? [1e3, $ar ? ' ألف' : 'K'] : [1, '']));

        return nq_mt_number(round($n / $div, 1), ['maxFraction' => 1], $locale).$unit;
    };
    $busy = $loading || $data === null;
    $channel = $data['channel'] ?? null;
    $subs = $channel['subscribers'] ?? null;
    $description = $channel
        ? ($subs === null ? $channel['name'] : sprintf($t['description'], $channel['name'], $compact($subs)))
        : null;
    $s = $data['summary'] ?? null;
    $tile = fn (string $id, string $label, array $total, array $extra) => array_merge(['id' => $id, 'label' => $label, 'value' => $total['value'], 'previous' => $total['previous'] ?? null, 'sparkline' => $total['trend'] ?? null], $extra);
    $tiles = $s ? [
        $tile('views', $t['views'], $s['views'], ['icon' => 'eye']),
        $tile('watchHours', $t['watchTime'], $s['watchHours'], ['icon' => 'clock']),
        $tile('subscribers', $t['subscribers'], $s['subscribers'], ['icon' => 'user-plus']),
        $tile('avgSeconds', $t['avgDuration'], $s['avgSeconds'], [
            'display' => $seconds($s['avgSeconds']['value']),
            'previousDisplay' => isset($s['avgSeconds']['previous']) ? $seconds($s['avgSeconds']['previous']) : null,
            'icon' => 'timer',
        ]),
    ] : [];
    $metrics = [
        ['id' => 'views', 'label' => $t['views'], 'color' => 'var(--primary)'],
        ['id' => 'watchHours', 'label' => $t['watchTime'], 'color' => 'var(--nq-tag-purple)'],
        ['id' => 'subscribers', 'label' => $t['subscribers'], 'color' => 'var(--nq-tag-teal)'],
    ];
    $videos = collect($data['videos'] ?? [])->keyBy('id');
    $videoRows = $videos->map(fn ($v) => ['id' => $v['id'], 'label' => $v['title'], 'value' => $v['views'], 'previous' => $v['previousViews'] ?? null, 'href' => $v['href'] ?? null])->values()->all();
    $videoColumns = [
        ['id' => 'watch', 'header' => $t['watch'], 'align' => 'end', 'cell' => fn ($r) => nq_mt_number($videos[$r['id']]['watchHours'] ?? 0, ['maxFraction' => 0], $locale)],
        ['id' => 'avg', 'header' => $t['avgView'], 'align' => 'end', 'cell' => fn ($r) => new \Illuminate\Support\HtmlString('<bdi dir="ltr">'.e($seconds($videos[$r['id']]['avgSeconds'] ?? 0)).'</bdi>')],
    ];
@endphp
<x-nq::analytics-connect.page-frame :title="$t['title']" :description="$description" :service="$service" :benefits="$t['benefits']" :error="$error"
    :retryable="$retryable" :refreshable="$refreshable" :refreshing="$refreshing" :updated-at="$updatedAt" :labels="$frameLabels" :attributes="$attributes">
    <x-slot:actions>
        <x-nq::time-series-panel.period-toggle :value="$period" :locale="$locale" data-slot="period-toggle" />
    </x-slot:actions>
    <div class="contents" x-data="nqYouTubeChannelPage">
        <x-nq::metric-tiles :metrics="$tiles" selectable selected="views" :loading="$busy" :locale="$locale" />
        <x-nq::time-series-panel :title="$t['chartTitle']" :description="$t['chartDescription']" :metrics="$metrics" :data="$data['series'] ?? []"
            :previous-data="$data['previousSeries'] ?? []" metric="views" :loading="$busy" :locale="$locale" />
    </div>
    <x-nq::tabs default-value="videos">
        <x-nq::tabs.list variant="underline">
            <x-nq::tabs.tab value="videos">{{ $t['tabVideos'] }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="traffic">{{ $t['tabTraffic'] }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="audience">{{ $t['tabAudience'] }}</x-nq::tabs.tab>
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>
        <x-nq::tabs.panel value="videos">
            <x-nq::breakdown-table :title="$t['tabVideos']" :dimension-label="$t['video']" :value-label="$t['views']" :rows="$videoRows" :limit="10" :show-share="false"
                :loading="$busy" :columns="$videoColumns" :locale="$locale" />
        </x-nq::tabs.panel>
        <x-nq::tabs.panel value="traffic">
            <x-nq::breakdown-table :title="$t['trafficSources']" :dimension-label="$t['source']" :value-label="$t['views']" :rows="$data['trafficSources'] ?? []" :loading="$busy" :locale="$locale" />
        </x-nq::tabs.panel>
        <x-nq::tabs.panel value="audience">
            <x-nq::geo-list :title="$t['countries']" :value-label="$t['views']" :rows="$data['countries'] ?? []" :limit="10" :loading="$busy" :locale="$locale" />
        </x-nq::tabs.panel>
    </x-nq::tabs>
</x-nq::analytics-connect.page-frame>
