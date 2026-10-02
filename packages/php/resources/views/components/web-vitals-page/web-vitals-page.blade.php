{{-- <x-nq::web-vitals-page :service="$service" :data="$data" site="nasaq.dev" device="mobile" :period="28" refreshable />
     The web vitals report: a verdict on Core Web Vitals, one gauge per metric with its distribution, a trend chart with Google's good and poor limits, and
     the busiest pages rated per metric. Until the service is connected it shows the connect screen.
     service: ['id', 'name', 'status' => 'connected', 'connectedAs', 'scopes' => [...]]. data: ['vitals' => ['LCP'|'INP'|'CLS'|'FCP'|'TTFB' => ['p75', 'previous',
     'distribution' => ['good', 'needsImprovement', 'poor']]], 'series' => [['date', 'LCP', 'INP', ...]], 'pages' => [['id', 'url', 'loads', 'vitals' => ['LCP' => 2100, ...]]]];
     without it the page shows skeletons. site: the origin, for the subtitle. device: mobile | desktop adds the device switch (an x-modelable toggle group in the
     header holding an array); omit to hide it. metric: the metric charted first (default LCP). period: the window in days (default 28); windows: the toggle's options
     (default 7, 28, 90). loading, error (replaces the report), retryable, refreshable, refreshing, updated-at, labels, frame-labels. Events as in
     analytics-connect.page-frame: nq-refresh, nq-retry, nq-disconnect, nq-connect, nq-select-account, each with detail.wait(promise). Choosing a gauge or switching
     the chart's metric moves both together (Alpine nqWebVitalsPage); the chart's switcher bubbles "nq-metric" ({ id }). Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.web-vital-gauge._logic')
@props(['service', 'data' => null, 'site' => null, 'device' => null, 'metric' => 'LCP', 'period' => 28, 'windows' => [7, 28, 90], 'loading' => false, 'error' => null, 'retryable' => false,
    'refreshable' => false, 'refreshing' => false, 'updatedAt' => null, 'labels' => [], 'frameLabels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'title' => 'مؤشرات الويب', 'description' => 'أداء %s عند المستخدمين الفعليين، عند المئين 75', 'pass' => 'يجتاز مؤشرات الويب الأساسية', 'fail' => 'لا يجتاز مؤشرات الويب الأساسية',
        'passHint' => 'مؤشرات LCP وINP وCLS جيدة في 75% على الأقل من تحميلات الصفحات.', 'failHint' => 'أحد مؤشرات LCP أو INP أو CLS ليس جيدًا في 75% من تحميلات الصفحات.',
        'noData' => 'لا بيانات كافية لتقييم مؤشرات الويب الأساسية بعد.', 'device' => 'الجهاز', 'mobile' => 'الجوال', 'desktop' => 'سطح المكتب', 'window' => 'النافذة الزمنية',
        'trendTitle' => 'الاتجاه', 'trendDescription' => '%s عند المئين 75 لكل يوم. الخطان المتقطعان يمثلان حدّي Google للجيد والضعيف.', 'goodLimit' => 'حد الجيد', 'poorLimit' => 'حد الضعيف',
        'pagesTitle' => 'الصفحات التي تُصلح أولًا', 'pagesDescription' => 'الصفحات الأكثر تحميلًا مع تقييم كل مؤشر', 'page' => 'الصفحة', 'loads' => 'تحميلات الصفحة',
        'good' => 'جيد', 'needs' => 'يحتاج إلى تحسين', 'poor' => 'ضعيف', 'empty' => 'لا صفحات لعرضها', 'days' => '%d يومًا',
        'benefits' => ['LCP وINP وCLS وFCP وTTFB عند المئين 75', 'كم تحميلًا جيدًا أو يحتاج إلى تحسين أو ضعيفًا', 'الاتجاه عبر الزمن والصفحات التي تُصلح أولًا'],
    ] : [
        'title' => 'Web vitals', 'description' => 'Real-user performance of %s, judged at the 75th percentile', 'pass' => 'Passes Core Web Vitals', 'fail' => 'Does not pass Core Web Vitals',
        'passHint' => 'LCP, INP and CLS are all good for at least 75% of page loads.', 'failHint' => 'At least one of LCP, INP or CLS is not good for 75% of page loads.',
        'noData' => 'Not enough data to assess Core Web Vitals yet.', 'device' => 'Device', 'mobile' => 'Mobile', 'desktop' => 'Desktop', 'window' => 'Time window',
        'trendTitle' => 'Trend', 'trendDescription' => "%s at the 75th percentile per day. Dashed lines mark Google's good and poor limits.", 'goodLimit' => 'Good limit', 'poorLimit' => 'Poor limit',
        'pagesTitle' => 'Pages to fix first', 'pagesDescription' => 'Pages with the most page loads, rated on each metric', 'page' => 'Page', 'loads' => 'Page loads',
        'good' => 'Good', 'needs' => 'Needs improvement', 'poor' => 'Poor', 'empty' => 'No pages to show', 'days' => '%d days',
        'benefits' => ['LCP, INP, CLS, FCP and TTFB at the 75th percentile', 'How many page loads are good, need improvement or are poor', 'Trend over time and the pages to fix first'],
    ], (array) $labels);
    $busy = $loading || $data === null;
    $ids = array_keys(nq_wv_thresholds());
    $core = ['LCP', 'INP', 'CLS'];
    $metric = in_array($metric, $ids, true) ? $metric : 'LCP';
    $p75 = [];
    foreach ($ids as $id) {
        $v = $data['vitals'][$id]['p75'] ?? null;
        if ($v !== null) {
            $p75[$id] = $v;
        }
    }
    $assessed = count(array_filter($core, fn ($id) => isset($p75[$id]))) === count($core);
    $passes = $assessed && count(array_filter($core, fn ($id) => nq_wv_rate($id, $p75[$id]) === 'good')) === count($core);
    $tone = ['good' => 'success', 'needs-improvement' => 'warning', 'poor' => 'danger'];
    $ratingTitle = fn (string $r) => $r === 'good' ? $t['good'] : ($r === 'poor' ? $t['poor'] : $t['needs']);
    $metrics = array_map(fn ($id) => ['id' => $id, 'label' => $id, 'aggregate' => 'avg', 'lowerIsBetter' => true, 'format' => ['maxFraction' => nq_wv_thresholds()[$id]['good'] < 1 ? 2 : 0]], $ids);
    $limit = fn (string $id, $v) => $id === 'CLS' ? (string) $v : nq_wv_format($id, $v, $locale);
    $daysLabel = fn (int $n) => sprintf($t['days'], $n);
@endphp
<x-nq::analytics-connect.page-frame :title="$t['title']" :description="$site ? sprintf($t['description'], $site) : null" :service="$service" :benefits="$t['benefits']" :error="$error"
    :retryable="$retryable" :refreshable="$refreshable" :refreshing="$refreshing" :updated-at="$updatedAt" :labels="$frameLabels" :attributes="$attributes">
    <x-slot:actions>
        @if ($device)
            <x-nq::toggle-group :default-value="[$device]" :aria-label="$t['device']" data-slot="device-toggle">
                <x-nq::toggle-group.toggle value="mobile">{{ $t['mobile'] }}</x-nq::toggle-group.toggle>
                <x-nq::toggle-group.toggle value="desktop">{{ $t['desktop'] }}</x-nq::toggle-group.toggle>
            </x-nq::toggle-group>
        @endif
        <x-nq::toggle-group :default-value="[(string) $period]" :aria-label="$t['window']" data-slot="period-toggle">
            @foreach ($windows as $n)
                <x-nq::toggle-group.toggle :value="(string) $n">{{ $daysLabel((int) $n) }}</x-nq::toggle-group.toggle>
            @endforeach
        </x-nq::toggle-group>
    </x-slot:actions>
    <div class="contents" x-data="nqWebVitalsPage(@js($metric))" x-on:nq-metric="choose($event.detail.id)">
        @if ($busy)
            <x-nq::states.skeleton class="h-20 w-full" />
        @else
            <x-nq::card data-slot="web-vitals-verdict" :data-pass="$assessed ? ($passes ? 'true' : 'false') : null">
                <x-nq::card.content class="flex items-center gap-3">
                    @if ($assessed)
                        @if ($passes)
                            <x-lucide-circle-check aria-hidden="true" class="size-8 shrink-0 text-nq-success-text" />
                        @else
                            <x-lucide-circle-x aria-hidden="true" class="size-8 shrink-0 text-nq-danger-text" />
                        @endif
                    @endif
                    <div class="flex min-w-0 flex-col">
                        <p class="text-h3 text-foreground">{{ $assessed ? ($passes ? $t['pass'] : $t['fail']) : $t['noData'] }}</p>
                        @if ($assessed)<p class="text-body-sm text-muted-foreground">{{ $passes ? $t['passHint'] : $t['failHint'] }}</p>@endif
                    </div>
                </x-nq::card.content>
            </x-nq::card>
        @endif
        <x-nq::web-vital-gauge.grid>
            @foreach ($ids as $id)
                <button type="button" x-bind:aria-pressed="String(metric === @js($id))" x-on:click="choose(@js($id))"
                    x-bind:class="metric === @js($id) ? '[&>[data-slot=web-vital-gauge]]:border-primary [&>[data-slot=web-vital-gauge]]:ring-1 [&>[data-slot=web-vital-gauge]]:ring-primary' : ''"
                    class="rounded-card text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                    <x-nq::web-vital-gauge :metric="$id" :value="$data['vitals'][$id]['p75'] ?? null" :previous="$data['vitals'][$id]['previous'] ?? null"
                        :distribution="$data['vitals'][$id]['distribution'] ?? null" :locale="$locale" />
                </button>
            @endforeach
        </x-nq::web-vital-gauge.grid>
        @foreach ($ids as $id)
            @php
                $th = nq_wv_thresholds()[$id];
                $lines = [
                    ['value' => $th['good'], 'label' => $t['goodLimit'].' '.$limit($id, $th['good']), 'tone' => 'success'],
                    ['value' => $th['poor'], 'label' => $t['poorLimit'].' '.$limit($id, $th['poor']), 'tone' => 'danger'],
                ];
            @endphp
            <div class="contents" data-metric-panel="{{ $id }}" x-show="metric === @js($id)" @if ($id !== $metric) style="display: none" @endif>
                <x-nq::time-series-panel :title="$t['trendTitle'].': '.$id" :description="sprintf($t['trendDescription'], $id)" :metrics="$metrics" :metric="$id"
                    :data="$data['series'] ?? []" :reference-lines="$lines" :loading="$busy" :locale="$locale" />
            </div>
        @endforeach
        <x-nq::card data-slot="web-vitals-pages">
            <x-nq::card.header>
                <x-nq::card.title as="h3">{{ $t['pagesTitle'] }}</x-nq::card.title>
                <x-nq::card.description>{{ $t['pagesDescription'] }}</x-nq::card.description>
            </x-nq::card.header>
            <x-nq::card.content class="px-0">
                @if ($busy)
                    <div class="flex flex-col gap-3 px-4">
                        @for ($i = 0; $i < 5; $i++)<x-nq::states.skeleton class="h-8 w-full" />@endfor
                    </div>
                @elseif (empty($data['pages']))
                    <p class="px-4 py-8 text-center text-body-sm text-muted-foreground">{{ $t['empty'] }}</p>
                @else
                    <x-nq::table :label="$t['pagesTitle']">
                        <x-nq::table.header>
                            <x-nq::table.row>
                                <x-nq::table.head>{{ $t['page'] }}</x-nq::table.head>
                                <x-nq::table.head class="text-end">{{ $t['loads'] }}</x-nq::table.head>
                                @foreach ($core as $id)<x-nq::table.head class="text-end">{{ $id }}</x-nq::table.head>@endforeach
                            </x-nq::table.row>
                        </x-nq::table.header>
                        <x-nq::table.body>
                            @foreach ($data['pages'] as $row)
                                <x-nq::table.row>
                                    <x-nq::table.cell class="max-w-0 min-w-40"><bdi dir="ltr" class="block truncate">{{ $row['url'] }}</bdi></x-nq::table.cell>
                                    <x-nq::table.cell class="text-end tabular-nums">{{ (new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::DECIMAL))->format($row['loads']) }}</x-nq::table.cell>
                                    @foreach ($core as $id)
                                        <x-nq::table.cell class="text-end tabular-nums">
                                            @if (! isset($row['vitals'][$id]))
                                                –
                                            @else
                                                @php $r = nq_wv_rate($id, $row['vitals'][$id]); @endphp
                                                <x-nq::status :tone="$tone[$r]" tinted :title="$ratingTitle($r)" class="justify-end"><bdi dir="ltr">{{ nq_wv_format($id, $row['vitals'][$id], $locale) }}</bdi></x-nq::status>
                                            @endif
                                        </x-nq::table.cell>
                                    @endforeach
                                </x-nq::table.row>
                            @endforeach
                        </x-nq::table.body>
                    </x-nq::table>
                @endif
            </x-nq::card.content>
        </x-nq::card>
    </div>
</x-nq::analytics-connect.page-frame>
