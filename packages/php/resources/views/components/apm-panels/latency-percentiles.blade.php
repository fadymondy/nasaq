{{-- <x-nq::apm-panels.latency-percentiles :target-ms="500" :summary="['p50' => 121, 'p95' => 486, 'p99' => 1140]" :data="[['time' => '2026-09-29T09:00', 'p50' => 118, 'p95' => 470, 'p99' => 1050]]" />
     The p50, p95 and p99 response time as three headline figures (with the change against the previous period, lower is better) and one line
     chart over time, with an optional p95 target guide. data: rows of time (ISO, e.g. "2026-09-29T10:15") and p50, p95, p99 in milliseconds.
     summary: the percentiles over the whole period (default: the 50th, 95th and 99th percentile of the buckets shown). previous: the same for
     the previous period. target-ms: a p95 target drawn as a guide line. title, description, loading, error (string or true), retry (draws the
     retry button; dispatches "nq-retry"). The action slot sits in the header. labels: array overriding the built-in words. --}}
@include('nasaq::components.apm-panels._logic')
@props(['data' => [], 'summary' => null, 'previous' => null, 'targetMs' => null, 'title' => null, 'description' => null, 'loading' => false, 'error' => null, 'retry' => false, 'labels' => [], 'locale' => null, 'action' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_apm_words($locale, $labels);
    $ar = str_starts_with($locale, 'ar');
    $data = array_values($data);
    $config = ['p50' => ['label' => $t['p50'], 'color' => 'var(--nq-tag-teal)'], 'p95' => ['label' => $t['p95'], 'color' => 'var(--nq-tag-amber)'], 'p99' => ['label' => $t['p99'], 'color' => 'var(--nq-tag-pink)']];
    $figures = $summary ?? [
        'p50' => nq_apm_percentile(array_column($data, 'p50'), 50),
        'p95' => nq_apm_percentile(array_column($data, 'p95'), 95),
        'p99' => nq_apm_percentile(array_column($data, 'p99'), 99),
    ];
    $hints = ['p50' => $t['median'], 'p95' => $t['slowest5'], 'p99' => $t['slowest1']];
    $rows = array_map(fn ($d) => ['label' => nq_apm_time($d['time'], $locale), 'values' => ['p50' => $d['p50'], 'p95' => $d['p95'], 'p99' => $d['p99']]], $data);
    $reference = $targetMs ? ['value' => $targetMs, 'label' => $t['target'].' '.$t['p95'].' '.$targetMs] : null;
    $deltaClass = fn ($d) => $d == 0 ? 'text-muted-foreground' : ($d < 0 ? 'text-nq-success-text' : 'text-nq-danger-text');
@endphp
<x-nq::card data-slot="{{ $attributes->get('data-slot', 'latency-percentiles') }}" {{ $attributes->except('data-slot')->merge(['aria-busy' => $loading ? 'true' : null]) }}>
    <x-nq::card.header>
        <x-nq::card.title as="h3">{{ $title ?? $t['latency'] }}</x-nq::card.title>
        <x-nq::card.description>{{ $description ?? $t['latencyDescription'] }}</x-nq::card.description>
        @if ($action && ! $action->isEmpty())<x-nq::card.action>{{ $action }}</x-nq::card.action>@endif
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-4">
        <dl class="grid grid-cols-3 gap-3">
            @foreach (['p50', 'p95', 'p99'] as $id)
                @php $delta = nq_apm_change($figures[$id], $previous[$id] ?? null); @endphp
                <div data-percentile="{{ $id }}" class="flex min-w-0 flex-col gap-0.5 rounded-control border border-border px-3 py-2">
                    <dt class="flex items-center gap-1.5 text-caption text-muted-foreground">
                        <span aria-hidden="true" class="size-2 rounded-full" style="background: {{ $config[$id]['color'] }}"></span>
                        <bdi dir="ltr" class="text-label text-foreground">{{ $t[$id] }}</bdi>
                        <span class="hidden truncate sm:inline">{{ $hints[$id] }}</span>
                    </dt>
                    <dd class="text-h3 text-foreground tabular-nums" dir="ltr">{{ nq_apm_millis($figures[$id], $ar) }}</dd>
                    @if ($delta !== null)
                        <dd class="text-caption {{ $deltaClass($delta) }}">
                            <bdi data-slot="num" data-numeric="" class="tabular-nums">{{ ($delta > 0 ? '+' : '').nq_apm_number($delta, $locale, 'percent', 0, 1) }}</bdi> <span class="text-muted-foreground">{{ $t['vsPrevious'] }}</span>
                        </dd>
                    @endif
                </div>
            @endforeach
        </dl>
        <x-nq::apm-panels.body :error="$error" :loading="$loading" :empty="count($data) === 0" :retry="$retry" :t="$t" height="h-64">
            <x-nq::apm-panels.chart :config="$config" :keys="['p50', 'p95', 'p99']" :rows="$rows" :reference="$reference" :label="$t['chartLatency']" tick="compact" format="int" :locale="$locale" class="h-64" />
        </x-nq::apm-panels.body>
    </x-nq::card.content>
</x-nq::card>
