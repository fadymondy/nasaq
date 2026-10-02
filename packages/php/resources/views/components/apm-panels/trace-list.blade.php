{{-- <x-nq::apm-panels.trace-list :traces="[['id' => 't1', 'method' => 'POST', 'name' => '/api/checkout', 'status' => 200, 'durationMs' => 1820, 'startedAt' => '2026-09-29T09:20:00Z', 'spans' => [['id' => 's1', 'name' => 'POST /api/checkout', 'service' => 'api', 'startMs' => 0, 'durationMs' => 1820]]]]" />
     Recent requests as rows: method, route, status (class word, not colour alone), duration with a bar sized against the slowest, and when it started.
     Choosing a trace that carries spans opens its waterfall under the list (Alpine nqApmTraces); choosing it again closes it, and either way a bubbling
     "nq-select" ({ id: string | null }) is dispatched. traces: rows of id, method, name, status, durationMs, startedAt, service, spans (rows of id, parentId,
     name, service, startMs, durationMs, error). selected-id: the trace open at first. slow-ms: above this a trace's bar is toned as slow (default 1000).
     title, description, loading, error (string or true), retry (dispatches "nq-retry"). labels: array overriding the built-in words. --}}
@include('nasaq::components.apm-panels._logic')
@props(['traces' => [], 'selectedId' => null, 'slowMs' => 1000, 'title' => null, 'description' => null, 'loading' => false, 'error' => null, 'retry' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_apm_words($locale, $labels);
    $ar = str_starts_with($locale, 'ar');
    $sorted = array_values($traces);
    usort($sorted, fn ($a, $b) => $b['durationMs'] <=> $a['durationMs']);
    $max = $sorted[0]['durationMs'] ?? 0;
    $classTone = ['2xx' => 'success', '3xx' => 'info', '4xx' => 'warning', '5xx' => 'danger', 'other' => 'neutral'];
@endphp
<x-nq::card data-slot="{{ $attributes->get('data-slot', 'trace-list') }}" x-data="nqApmTraces({!! \Illuminate\Support\Js::from($selectedId) !!})" {{ $attributes->except('data-slot')->merge(['aria-busy' => $loading ? 'true' : null]) }}>
    <x-nq::card.header>
        <x-nq::card.title as="h3">{{ $title ?? $t['traces'] }}</x-nq::card.title>
        <x-nq::card.description>{{ $description ?? $t['tracesDescription'] }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <x-nq::apm-panels.body :error="$error" :loading="$loading" :empty="count($sorted) === 0" :retry="$retry" :t="$t" height="h-40">
            <ul class="flex flex-col divide-y divide-border rounded-control border border-border">
                @foreach ($sorted as $trace)
                    @php
                        $class = nq_apm_status_class($trace['status']);
                        $slow = $trace['durationMs'] > $slowMs;
                        $bar = $class === '5xx' ? 'bg-nq-danger' : ($slow ? 'bg-nq-warning' : 'bg-primary');
                        $spanCount = isset($trace['spans']) ? count($trace['spans']) : null;
                    @endphp
                    <li>
                        <button type="button" x-bind:aria-pressed="String(selected === @js((string) $trace['id']))" aria-label="{{ sprintf($t['selectTrace'], $trace['method'].' '.$trace['name']) }}" x-on:click="toggle(@js((string) $trace['id']))"
                            x-bind:class="selected === @js((string) $trace['id']) ? 'bg-muted' : ''"
                            class="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-3 py-2 text-start outline-none hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
                            <span class="flex min-w-0 flex-col gap-1">
                                <bdi dir="ltr" class="flex min-w-0 items-center gap-2">
                                    <x-nq::badge variant="outline" class="font-mono">{{ $trace['method'] }}</x-nq::badge>
                                    <span class="truncate font-mono text-code text-foreground">{{ $trace['name'] }}</span>
                                </bdi>
                                <span class="flex flex-wrap items-center gap-x-3 text-caption text-muted-foreground">
                                    <x-nq::status :tone="$classTone[$class]" class="text-caption"><bdi dir="ltr">{{ $trace['status'] }}</bdi></x-nq::status>
                                    <x-nq::numeric.date-time :value="$trace['startedAt']" relative />
                                    @if ($spanCount !== null)<span>{{ $spanCount === 1 ? $t['spansOne'] : sprintf($t['spans'], $spanCount) }}</span>@endif
                                    @if (! empty($trace['service']))<bdi dir="ltr">{{ $trace['service'] }}</bdi>@endif
                                </span>
                            </span>
                            <span class="hidden sm:block" aria-hidden="true">
                                <span class="block h-2 rounded-full bg-nq-surface-soft">
                                    <span class="block h-full rounded-full {{ $bar }}" style="width: {{ $max > 0 ? round(max(3, ($trace['durationMs'] / $max) * 100), 2) : 0 }}%"></span>
                                </span>
                            </span>
                            <span class="text-label tabular-nums {{ $slow ? 'text-nq-warning-text' : 'text-foreground' }}" dir="ltr">{{ nq_apm_millis($trace['durationMs'], $ar) }}</span>
                        </button>
                    </li>
                @endforeach
            </ul>
        </x-nq::apm-panels.body>
        @foreach ($sorted as $trace)
            @if (! empty($trace['spans']))
                @php
                    $spans = $trace['spans'];
                    usort($spans, fn ($a, $b) => $a['startMs'] <=> $b['startMs']);
                    $depths = nq_apm_span_depths($spans);
                    $origin = min(array_column($spans, 'startMs'));
                    $extent = max(1, nq_apm_trace_extent($spans));
                @endphp
                <section data-slot="trace-waterfall" data-trace-id="{{ $trace['id'] }}" aria-label="{{ sprintf($t['waterfallOf'], $trace['name']) }}" x-show="selected === @js((string) $trace['id'])" style="display: none"
                    class="flex flex-col gap-2 rounded-control border border-border p-3">
                    <h4 class="text-label text-foreground">{{ $t['waterfall'] }}</h4>
                    <ul class="flex flex-col gap-1.5">
                        @foreach ($spans as $s)
                            @php
                                $left = (($s['startMs'] - $origin) / $extent) * 100;
                                $width = max(0.8, ($s['durationMs'] / $extent) * 100);
                                $failed = ! empty($s['error']);
                            @endphp
                            <li class="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]" style="--depth: {{ $depths[$s['id']] ?? 0 }}">
                                <div class="min-w-0 ps-[calc(var(--depth)*0.75rem)]">
                                    <bdi dir="ltr" class="block truncate font-mono text-code text-foreground">{{ $s['name'] }}</bdi>
                                    <span class="block truncate text-caption text-muted-foreground" dir="ltr">{{ $s['service'] }}</span>
                                </div>
                                <div class="relative h-5 rounded-control bg-nq-surface-soft" role="img" aria-label="{{ $s['name'] }}, {{ nq_apm_millis($s['durationMs'], $ar) }}{{ $failed ? ', '.$t['failed'] : '' }}">
                                    <span class="absolute inset-y-0.5 flex items-center rounded-[3px] px-1 text-caption {{ $failed ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground' }}"
                                        style="inset-inline-start: {{ round($left, 2) }}%; width: {{ round(min($width, 100 - $left), 2) }}%"></span>
                                    <span class="absolute inset-y-0 flex items-center text-caption text-foreground tabular-nums" style="inset-inline-start: {{ round(min($left + $width + 1, 82), 2) }}%" dir="ltr">{{ nq_apm_millis($s['durationMs'], $ar) }}</span>
                                </div>
                            </li>
                        @endforeach
                    </ul>
                </section>
            @endif
        @endforeach
    </x-nq::card.content>
</x-nq::card>
