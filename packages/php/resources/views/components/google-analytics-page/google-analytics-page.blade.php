{{-- <x-nq::google-analytics-page :service="$service" :data="$data" property="nasaq.dev" :period="28" :range="['from' => '2026-09-01', 'to' => '2026-09-29']" refreshable />
     The Google Analytics report: users, sessions, engagement rate, engagement time and key-event tiles with comparison, a traffic chart, an optional live
     counter, and tabs for sources, pages and audience. Until the service is connected it shows the connect screen.
     service: ['id', 'name', 'status' => 'connected', 'connectedAs', 'scopes' => [...], 'accounts', 'accountId']. data: ['summary' => ['users'|'sessions'|
     'engagementRate'|'engagementSeconds'|'conversions' => ['value', 'previous', 'trend']] (a rate is a fraction, 0.61; time is seconds), 'series' => [['date',
     'users', 'sessions', 'conversions']], 'previousSeries', 'realtime' => ['active', 'perMinute', 'pages', 'countries' => [['code', 'value']], 'updatedAt'],
     'channels', 'sourceMedium', 'pages' (breakdown rows ['id', 'label', 'value', 'previous']), 'countries', 'devices', 'daily' => [['date', 'count']]]; without
     it the page shows skeletons. property: the site, for the subtitle (default the chosen account). range: ['from', 'to'] of the activity calendar.
     period: the window in days (default 28); the toggle in the header is an x-modelable toggle group (its value is an array holding the days as a string).
     loading, error (replaces the report), retryable, refreshable, refreshing, updated-at, labels, frame-labels. Events as in analytics-connect.page-frame:
     nq-refresh, nq-retry, nq-disconnect, nq-connect, nq-select-account, each with detail.wait(promise). Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.metric-tiles._logic')
@props(['service', 'data' => null, 'property' => null, 'range' => null, 'period' => 28, 'loading' => false, 'error' => null, 'retryable' => false,
    'refreshable' => false, 'refreshing' => false, 'updatedAt' => null, 'labels' => [], 'frameLabels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'title' => 'Google Analytics', 'description' => 'الزيارات والتفاعل لـ %s', 'users' => 'المستخدمون', 'sessions' => 'الجلسات', 'engagementRate' => 'معدل التفاعل',
        'engagementTime' => 'متوسط وقت التفاعل', 'conversions' => 'الأحداث الرئيسية', 'trafficTitle' => 'الزيارات', 'trafficDescription' => 'الإجماليات اليومية للفترة المحددة',
        'tabSources' => 'المصادر', 'tabPages' => 'الصفحات', 'tabAudience' => 'الجمهور', 'channels' => 'مجموعة القنوات الافتراضية', 'sourceMedium' => 'المصدر / الوسيط',
        'pages' => 'أكثر الصفحات زيارة', 'page' => 'الصفحة', 'channel' => 'القناة', 'source' => 'المصدر / الوسيط', 'devices' => 'الأجهزة', 'device' => 'الجهاز',
        'countries' => 'الدول', 'activity' => 'الجلسات حسب اليوم', 'activityDescription' => 'الأيام الأغمق كانت أكثر جلسات', 'realtimeTitle' => 'الآن',
        'realtimeDescription' => 'المستخدمون النشطون في آخر 30 دقيقة', 'realtimePages' => 'أكثر الصفحات نشاطًا', 'realtimeCountries' => 'أكثر الدول',
        'benefits' => ['المستخدمون والجلسات والأحداث الرئيسية مقارنة بالفترة السابقة', 'مصادر الزيارات وأكثر الصفحات', 'الدول والأجهزة', 'المستخدمون النشطون الآن'],
    ] : [
        'title' => 'Google Analytics', 'description' => 'Traffic and engagement for %s', 'users' => 'Users', 'sessions' => 'Sessions', 'engagementRate' => 'Engagement rate',
        'engagementTime' => 'Avg. engagement time', 'conversions' => 'Key events', 'trafficTitle' => 'Traffic', 'trafficDescription' => 'Daily totals for the selected period',
        'tabSources' => 'Sources', 'tabPages' => 'Pages', 'tabAudience' => 'Audience', 'channels' => 'Default channel group', 'sourceMedium' => 'Source / medium',
        'pages' => 'Top pages', 'page' => 'Page', 'channel' => 'Channel', 'source' => 'Source / medium', 'devices' => 'Devices', 'device' => 'Device',
        'countries' => 'Countries', 'activity' => 'Sessions by day', 'activityDescription' => 'Darker days had more sessions', 'realtimeTitle' => 'Right now',
        'realtimeDescription' => 'Active users in the last 30 minutes', 'realtimePages' => 'Top active pages', 'realtimeCountries' => 'Top countries',
        'benefits' => ['Users, sessions and key events against the previous period', 'Traffic sources and top pages', 'Countries and devices', 'Live active users'],
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
    $accounts = (array) ($service['accounts'] ?? []);
    $accountName = null;
    foreach ($accounts as $a) {
        if (($a['id'] ?? null) === ($service['accountId'] ?? null)) {
            $accountName = $a['name'] ?? null;
        }
    }
    $accountName ??= $accounts[0]['name'] ?? null;
    $site = $property ?? $accountName;
    $busy = $loading || $data === null;
    $s = $data['summary'] ?? null;
    $tile = fn (string $id, string $label, array $total, array $extra) => array_merge(['id' => $id, 'label' => $label, 'value' => $total['value'], 'previous' => $total['previous'] ?? null, 'sparkline' => $total['trend'] ?? null], $extra);
    $tiles = $s ? [
        $tile('users', $t['users'], $s['users'], ['icon' => 'users']),
        $tile('sessions', $t['sessions'], $s['sessions'], ['icon' => 'activity']),
        $tile('engagementRate', $t['engagementRate'], $s['engagementRate'], ['format' => ['style' => 'percent', 'maxFraction' => 1], 'icon' => 'mouse-pointer-click']),
        $tile('engagementSeconds', $t['engagementTime'], $s['engagementSeconds'], [
            'display' => $seconds($s['engagementSeconds']['value']),
            'previousDisplay' => isset($s['engagementSeconds']['previous']) ? $seconds($s['engagementSeconds']['previous']) : null,
            'icon' => 'clock',
        ]),
        $tile('conversions', $t['conversions'], $s['conversions'], ['icon' => 'target']),
    ] : [];
    $metrics = [
        ['id' => 'users', 'label' => $t['users'], 'color' => 'var(--primary)'],
        ['id' => 'sessions', 'label' => $t['sessions'], 'color' => 'var(--nq-tag-teal)'],
        ['id' => 'conversions', 'label' => $t['conversions'], 'color' => 'var(--nq-tag-orange)'],
    ];
    $rt = $data['realtime'] ?? null;
    $realtimeSections = [];
    if ($rt) {
        $countryRows = [];
        foreach ($rt['countries'] ?? [] as $c) {
            $code = strtoupper((string) $c['code']);
            $flag = preg_match('/^[A-Z]{2}$/', $code) === 1 ? mb_chr(0x1F1E6 + ord($code[0]) - 65).mb_chr(0x1F1E6 + ord($code[1]) - 65) : '';
            $name = $code;
            if ($flag !== '' && class_exists(\Locale::class)) {
                $name = \Locale::getDisplayRegion('-'.$code, $locale) ?: $code;
            }
            $countryRows[] = ['id' => $c['code'], 'label' => trim($flag.' '.$name), 'value' => $c['value']];
        }
        $realtimeSections = [
            ['id' => 'pages', 'title' => $t['realtimePages'], 'ltr' => true, 'rows' => $rt['pages'] ?? []],
            ['id' => 'countries', 'title' => $t['realtimeCountries'], 'rows' => $countryRows],
        ];
    }
@endphp
<x-nq::analytics-connect.page-frame :title="$t['title']" :description="$site ? sprintf($t['description'], $site) : null" :service="$service" :benefits="$t['benefits']" :error="$error"
    :retryable="$retryable" :refreshable="$refreshable" :refreshing="$refreshing" :updated-at="$updatedAt" :labels="$frameLabels" :attributes="$attributes">
    <x-slot:actions>
        <x-nq::time-series-panel.period-toggle :value="$period" :locale="$locale" data-slot="period-toggle" />
    </x-slot:actions>
    <x-nq::metric-tiles :metrics="$tiles" :loading="$busy" :skeletons="5" :locale="$locale" />
    <div class="grid gap-4 {{ $rt ? 'xl:grid-cols-[minmax(0,1fr)_20rem]' : '' }}">
        <x-nq::time-series-panel :title="$t['trafficTitle']" :description="$t['trafficDescription']" :metrics="$metrics" :data="$data['series'] ?? []"
            :previous-data="$data['previousSeries'] ?? []" metric="users" :loading="$busy" :locale="$locale" />
        @if ($rt)
            <x-nq::realtime-counter :title="$t['realtimeTitle']" :description="$t['realtimeDescription']" :value="$rt['active']" :per-minute="$rt['perMinute'] ?? []"
                :updated-at="$rt['updatedAt'] ?? null" :sections="$realtimeSections" :locale="$locale" />
        @endif
    </div>
    <x-nq::tabs default-value="sources">
        <x-nq::tabs.list variant="underline">
            <x-nq::tabs.tab value="sources">{{ $t['tabSources'] }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="pages">{{ $t['tabPages'] }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="audience">{{ $t['tabAudience'] }}</x-nq::tabs.tab>
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>
        <x-nq::tabs.panel value="sources" class="grid gap-4 lg:grid-cols-2">
            <x-nq::breakdown-table :title="$t['channels']" :dimension-label="$t['channel']" :value-label="$t['sessions']" :rows="$data['channels'] ?? []" :loading="$busy" :locale="$locale" />
            <x-nq::breakdown-table :title="$t['sourceMedium']" :dimension-label="$t['source']" :value-label="$t['sessions']" :rows="$data['sourceMedium'] ?? []" ltr-labels :loading="$busy" :locale="$locale" />
        </x-nq::tabs.panel>
        <x-nq::tabs.panel value="pages">
            <x-nq::breakdown-table :title="$t['pages']" :dimension-label="$t['page']" :value-label="$t['sessions']" :rows="$data['pages'] ?? []" ltr-labels :limit="10" :loading="$busy" :locale="$locale" />
        </x-nq::tabs.panel>
        <x-nq::tabs.panel value="audience" class="grid gap-4 lg:grid-cols-2">
            <x-nq::geo-list :title="$t['countries']" :value-label="$t['users']" :rows="$data['countries'] ?? []" :loading="$busy" :locale="$locale" />
            <div class="flex flex-col gap-4">
                <x-nq::breakdown-table :title="$t['devices']" :dimension-label="$t['device']" :value-label="$t['users']" :rows="$data['devices'] ?? []" :loading="$busy" :locale="$locale" />
                @if (! empty($data['daily']) && $range)
                    <x-nq::card>
                        <x-nq::card.header>
                            <x-nq::card.title as="h3">{{ $t['activity'] }}</x-nq::card.title>
                            <x-nq::card.description>{{ $t['activityDescription'] }}</x-nq::card.description>
                        </x-nq::card.header>
                        <x-nq::card.content class="overflow-x-auto">
                            <x-nq::heatmap :data="$data['daily']" :from="$range['from']" :to="$range['to']" color="var(--nq-tag-teal)" :cell-size="14" :label="$t['activity']" :locale="$locale" />
                        </x-nq::card.content>
                    </x-nq::card>
                @endif
            </div>
        </x-nq::tabs.panel>
    </x-nq::tabs>
</x-nq::analytics-connect.page-frame>
