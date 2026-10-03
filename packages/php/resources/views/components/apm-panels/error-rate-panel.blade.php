{{-- <x-nq::apm-panels.error-rate-panel :slo="0.01" :data="[['time' => '2026-09-29T09:00', 'requests' => 1200, 'errors' => 9]]" :top-errors="[['id' => 'e1', 'message' => 'TimeoutError', 'count' => 14, 'endpoint' => 'POST /api/checkout', 'lastSeenAt' => '2026-09-29T09:20:00Z']]" />
     Error rate over time with the overall rate as a headline (toned against an optional objective, with an icon and a word), the total errors
     and requests, and the most frequent errors. data: rows of time (ISO), requests and errors. previous-rate: the previous period's overall
     rate as a fraction, for the change. slo: error-rate objective as a fraction (0.01 is 1%), drawn as a guide; the headline says within or
     over. top-errors: rows of id, message, count, endpoint, lastSeenAt. error-click: the top errors are buttons that dispatch a bubbling
     "nq-select" ({ id }). title, description, loading, error (string or true), retry (dispatches "nq-retry"). labels: array overriding the words. --}}
@include('nasaq::components.apm-panels._logic')
@props(['data' => [], 'previousRate' => null, 'slo' => null, 'topErrors' => null, 'errorClick' => false, 'title' => null, 'description' => null, 'loading' => false, 'error' => null, 'retry' => false, 'labels' => [], 'locale' => null, 'action' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_apm_words($locale, $labels);
    $data = array_values($data);
    $requests = array_sum(array_column($data, 'requests'));
    $errors = array_sum(array_column($data, 'errors'));
    $overall = nq_apm_error_rate($errors, $requests);
    $delta = nq_apm_change($overall, $previousRate);
    $over = $slo !== null && $overall > $slo;
    $config = ['rate' => ['label' => $t['errorRate'], 'color' => 'var(--nq-danger)']];
    $rows = array_map(fn ($d) => ['label' => nq_apm_time($d['time'], $locale), 'values' => ['rate' => nq_apm_error_rate($d['errors'], $d['requests'])]], $data);
    $reference = $slo !== null ? ['value' => $slo, 'label' => $t['slo']] : null;
    $showHeadline = ! $loading && ! $error && count($data) > 0;
    $deltaClass = fn ($d) => $d == 0 ? 'text-muted-foreground' : ($d < 0 ? 'text-nq-success-text' : 'text-nq-danger-text');
    $extra = ['aria-busy' => $loading ? 'true' : null, 'data-over-slo' => $slo === null ? null : ($over ? 'true' : 'false')];
    if ($errorClick) {
        $extra['x-data'] = '{ pick(id) { $el.dispatchEvent(new CustomEvent(`nq-select`, { bubbles: true, detail: { id } })) } }';
    }
@endphp
<x-nq::card data-slot="{{ $attributes->get('data-slot', 'error-rate-panel') }}" {{ $attributes->except('data-slot')->merge($extra) }}>
    <x-nq::card.header>
        <x-nq::card.title as="h3">{{ $title ?? $t['errorRate'] }}</x-nq::card.title>
        <x-nq::card.description>{{ $description ?? $t['errorDescription'] }}</x-nq::card.description>
        @if ($action && ! $action->isEmpty())<x-nq::card.action>{{ $action }}</x-nq::card.action>@endif
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-4">
        @if ($showHeadline)
            <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <div class="flex flex-wrap items-baseline gap-x-3">
                    <span class="text-h1 text-foreground tabular-nums"><x-nq::numeric :value="$overall" style="percent" :max-fraction="2" /></span>
                    @if ($delta !== null)
                        <span class="text-label {{ $deltaClass($delta) }}">
                            <bdi data-slot="num" data-numeric="" class="tabular-nums">{{ ($delta > 0 ? '+' : '').nq_apm_number($delta, $locale, 'percent', 0, 1) }}</bdi> <span class="font-normal text-muted-foreground">{{ $t['vsPrevious'] }}</span>
                        </span>
                    @endif
                    @if ($slo !== null)<x-nq::status :tone="$over ? 'danger' : 'success'" tinted>{{ $over ? $t['overSlo'] : $t['withinSlo'] }}</x-nq::status>@endif
                </div>
                <dl class="flex gap-5 text-caption text-muted-foreground">
                    <div>
                        <dt>{{ $t['errors'] }}</dt>
                        <dd class="text-body-sm text-foreground tabular-nums"><x-nq::numeric :value="$errors" /></dd>
                    </div>
                    <div>
                        <dt>{{ $t['requests'] }}</dt>
                        <dd class="text-body-sm text-foreground tabular-nums"><x-nq::numeric :value="$requests" /></dd>
                    </div>
                </dl>
            </div>
        @endif
        <x-nq::apm-panels.body :error="$error" :loading="$loading" :empty="count($data) === 0" :retry="$retry" :t="$t" height="h-52">
            <x-nq::apm-panels.chart kind="area" :config="$config" :keys="['rate']" :rows="$rows" :reference="$reference" :label="$t['chartErrors']" tick="percent" format="percent" :locale="$locale" class="h-52" />
        </x-nq::apm-panels.body>
        @if ($topErrors !== null)
            <section aria-label="{{ $t['topErrors'] }}" class="flex flex-col gap-2">
                <h4 class="text-label text-muted-foreground">{{ $t['topErrors'] }}</h4>
                @if (count($topErrors) === 0)
                    <p class="text-body-sm text-muted-foreground">{{ $t['noErrors'] }}</p>
                @else
                    <ul class="flex flex-col divide-y divide-border rounded-control border border-border">
                        @foreach ($topErrors as $e)
                            <li>
                                @if ($errorClick)<button type="button" x-on:click="pick(@js($e['id']))" class="flex w-full items-start gap-2.5 px-3 py-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-nq-focus">@else<div class="flex items-start gap-2.5 px-3 py-2">@endif
                                    <x-lucide-triangle-alert aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-danger-text" />
                                    <span class="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
                                        <bdi dir="ltr" class="truncate font-mono text-code text-foreground">{{ $e['message'] }}</bdi>
                                        <span class="flex flex-wrap gap-x-3 text-caption text-muted-foreground">
                                            @if (! empty($e['endpoint']))<bdi dir="ltr">{{ $e['endpoint'] }}</bdi>@endif
                                            @if (isset($e['lastSeenAt']))<span>{{ $t['lastSeen'] }} <x-nq::numeric.date-time :value="$e['lastSeenAt']" relative /></span>@endif
                                        </span>
                                    </span>
                                    <x-nq::badge variant="danger">{{ $e['count'] === 1 ? $t['occurrencesOne'] : sprintf($t['occurrences'], $e['count']) }}</x-nq::badge>
                                @if ($errorClick)</button>@else</div>@endif
                            </li>
                        @endforeach
                    </ul>
                @endif
            </section>
        @endif
    </x-nq::card.content>
</x-nq::card>
