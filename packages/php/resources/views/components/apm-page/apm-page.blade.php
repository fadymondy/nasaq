{{-- <x-nq::apm-page :service="$service" :data="$data" app="api.nasaq.dev" :target-ms="500" :slo="0.01" :period="6" refreshable />
     The application performance report: request, throughput, p95 and error-rate tiles, latency percentiles, error rate with its top errors,
     throughput, slow endpoints and a trace list with a span waterfall. Until the service is connected it shows the connect screen.
     service: ['id', 'name', 'status' => 'connected', 'connectedAs', 'scopes' => [...]]. data: ['summary' => ['requests'|'throughput'|'p95'|'errorRate' =>
     ['value', 'previous', 'trend']], 'latency' => [['time', 'p50', 'p95', 'p99']], 'latencySummary', 'previousLatencySummary', 'errors' => [['time', 'requests',
     'errors']], 'previousErrorRate', 'topErrors', 'throughput' => [['date', 'rpm']], 'previousThroughput', 'endpoints', 'traces']; without it the page shows skeletons.
     app: the application, for the subtitle. slow-ms (default 1000), target-ms, slo (fraction). period: the window in hours (default 6); windows: the toggle's
     options (default 1, 6, 24). The toggle is an x-modelable toggle group in the header: its value is an array holding the hours as a string.
     loading, error (replaces the report), retryable, refreshable, refreshing, updated-at, labels, frame-labels. Events as in analytics-connect.page-frame:
     nq-refresh, nq-retry, nq-disconnect, nq-connect, nq-select-account, each with detail.wait(promise). Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.metric-tiles._logic')
@include('nasaq::components.apm-panels._logic')
@props(['service', 'data' => null, 'app' => null, 'slowMs' => 1000, 'targetMs' => null, 'slo' => null, 'period' => 6, 'windows' => [1, 6, 24], 'loading' => false, 'error' => null, 'retryable' => false,
    'refreshable' => false, 'refreshing' => false, 'updatedAt' => null, 'labels' => [], 'frameLabels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $hoursLabel = function (int $n) use ($ar): string {
        if ($ar) {
            return $n === 1 ? 'ساعة' : ($n === 2 ? 'ساعتان' : ($n <= 10 ? $n.' ساعات' : $n.' ساعة'));
        }

        return $n === 1 ? '1 hour' : $n.' hours';
    };
    $t = array_merge($ar ? [
        'title' => 'أداء التطبيق', 'description' => 'زمن الاستجابة والأخطاء والتتبّعات لـ %s', 'requests' => 'الطلبات', 'throughput' => 'معدل الطلبات (في الدقيقة)',
        'p95' => 'زمن الاستجابة p95', 'errorRate' => 'نسبة الأخطاء', 'throughputTitle' => 'معدل الطلبات', 'throughputDescription' => 'الطلبات في الدقيقة',
        'tabEndpoints' => 'النقاط البطيئة', 'tabTraces' => 'التتبّعات', 'endpointsTitle' => 'نقاط النهاية', 'endpointsDescription' => 'مرتبة حسب p95. البطيئة منها معلّمة.',
        'tracesTitle' => 'أحدث التتبّعات', 'window' => 'النافذة الزمنية',
        'benefits' => ['نسب زمن الاستجابة p50 وp95 وp99', 'معدل الطلبات ونسبة الأخطاء', 'النقاط البطيئة وتتبّعات الطلبات'],
    ] : [
        'title' => 'Application performance', 'description' => 'Latency, errors and traces for %s', 'requests' => 'Requests', 'throughput' => 'Throughput (req/min)',
        'p95' => 'p95 latency', 'errorRate' => 'Error rate', 'throughputTitle' => 'Throughput', 'throughputDescription' => 'Requests per minute',
        'tabEndpoints' => 'Slow endpoints', 'tabTraces' => 'Traces', 'endpointsTitle' => 'Endpoints', 'endpointsDescription' => 'Sorted by p95. Slow ones are marked.',
        'tracesTitle' => 'Recent traces', 'window' => 'Time window',
        'benefits' => ['Latency percentiles p50, p95 and p99', 'Throughput and error rate', 'Slow endpoints and request traces'],
    ], (array) $labels);
    $busy = $loading || $data === null;
    $s = $data['summary'] ?? null;
    $tile = fn (string $id, string $label, array $total, array $extra) => array_merge(['id' => $id, 'label' => $label, 'value' => $total['value'], 'previous' => $total['previous'] ?? null, 'sparkline' => $total['trend'] ?? null], $extra);
    $tiles = $s ? [
        $tile('requests', $t['requests'], $s['requests'], ['format' => ['compact' => true, 'maxFraction' => 1], 'icon' => 'activity']),
        $tile('throughput', $t['throughput'], $s['throughput'], ['format' => ['maxFraction' => 0], 'icon' => 'gauge']),
        $tile('p95', $t['p95'], $s['p95'], [
            'display' => nq_apm_millis($s['p95']['value'], $ar),
            'previousDisplay' => isset($s['p95']['previous']) ? nq_apm_millis($s['p95']['previous'], $ar) : null,
            'invert' => true, 'icon' => 'timer',
        ]),
        $tile('errorRate', $t['errorRate'], $s['errorRate'], ['format' => ['style' => 'percent', 'maxFraction' => 2], 'invert' => true, 'icon' => 'triangle-alert']),
    ] : [];
    $throughputMetrics = [['id' => 'rpm', 'label' => $t['throughput'], 'aggregate' => 'avg', 'format' => ['maxFraction' => 0]]];
@endphp
<x-nq::analytics-connect.page-frame :title="$t['title']" :description="$app ? sprintf($t['description'], $app) : null" :service="$service" :benefits="$t['benefits']" :error="$error"
    :retryable="$retryable" :refreshable="$refreshable" :refreshing="$refreshing" :updated-at="$updatedAt" :labels="$frameLabels" :attributes="$attributes">
    <x-slot:actions>
        <x-nq::toggle-group :default-value="[(string) $period]" :aria-label="$t['window']" data-slot="period-toggle">
            @foreach ($windows as $n)
                <x-nq::toggle-group.toggle :value="(string) $n">{{ $hoursLabel((int) $n) }}</x-nq::toggle-group.toggle>
            @endforeach
        </x-nq::toggle-group>
    </x-slot:actions>
    <x-nq::metric-tiles :metrics="$tiles" :loading="$busy" :locale="$locale" />
    <div class="grid gap-4 xl:grid-cols-2">
        <x-nq::apm-panels.latency-percentiles :data="$data['latency'] ?? []" :summary="$data['latencySummary'] ?? null" :previous="$data['previousLatencySummary'] ?? null" :target-ms="$targetMs" :loading="$busy" :locale="$locale" />
        <x-nq::apm-panels.error-rate-panel :data="$data['errors'] ?? []" :previous-rate="$data['previousErrorRate'] ?? null" :slo="$slo" :top-errors="$data['topErrors'] ?? null" :loading="$busy" :locale="$locale" />
    </div>
    <x-nq::time-series-panel :title="$t['throughputTitle']" :description="$t['throughputDescription']" :metrics="$throughputMetrics"
        :data="$data['throughput'] ?? []" :previous-data="$data['previousThroughput'] ?? []" :loading="$busy" :locale="$locale" />
    <x-nq::tabs default-value="endpoints">
        <x-nq::tabs.list variant="underline">
            <x-nq::tabs.tab value="endpoints">{{ $t['tabEndpoints'] }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="traces">{{ $t['tabTraces'] }}</x-nq::tabs.tab>
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>
        <x-nq::tabs.panel value="endpoints">
            <x-nq::apm-panels.endpoint-table :title="$t['endpointsTitle']" :description="$t['endpointsDescription']" :rows="$data['endpoints'] ?? []" :slow-ms="$slowMs" :loading="$busy" :locale="$locale" />
        </x-nq::tabs.panel>
        <x-nq::tabs.panel value="traces">
            <x-nq::apm-panels.trace-list :title="$t['tracesTitle']" :traces="$data['traces'] ?? []" :slow-ms="$slowMs" :loading="$busy" :locale="$locale" />
        </x-nq::tabs.panel>
    </x-nq::tabs>
</x-nq::analytics-connect.page-frame>
