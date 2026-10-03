{{-- <x-nq::time-series-panel title="Traffic" :metrics="[['id' => 'users', 'label' => 'Users'], ['id' => 'sessions', 'label' => 'Sessions']]"
         :data="[['date' => '2026-09-27', 'users' => 2100, 'sessions' => 2700], ...]" :previous-data="[['date' => '2026-08-30', 'users' => 1900, 'sessions' => 2450], ...]" />
     A time-series chart for one metric at a time with a period comparison: the current period as a filled line, the previous period as a dashed line
     behind it, a total with its change, a metric switcher and a compare switch. Rates use the mean, counts the sum. The chart is plain SVG, no library.
     metrics: array of ['id', 'label', 'aggregate' => 'sum'|'avg', 'lowerIsBetter', 'color', 'format' => ['style' => 'percent', 'maxFraction' => 1]].
     data: rows of ['date' => '2026-09-27' (or an ISO time), '<metric id>' => number]. previous-data: the comparison period, index-aligned with data.
     metric: the metric shown first (default the first). compare: whether the comparison line shows first (default true). reference-lines: [['value' => 2000,
     'label' => 'Goal', 'tone' => 'success'|'warning'|'danger']]. date-format: Intl-style options for the dates, e.g. ['month' => 'short', 'day' => 'numeric'].
     chart-class-name: chart height class (default h-64). loading: skeleton. error: a message or true for the built-in one; retry adds a "Try again" button
     that dispatches a bubbling "nq-retry". Switching metric or compare dispatches a bubbling "nq-metric" ({ id }) / "nq-compare" ({ on }).
     labels: array overriding the built-in words. The action slot sits at the end of the header. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.time-series-panel._logic')
@props(['metrics' => [], 'data' => [], 'previousData' => [], 'title' => null, 'description' => null, 'metric' => null, 'compare' => true, 'referenceLines' => [], 'dateFormat' => null, 'chartClassName' => 'h-64', 'loading' => false, 'error' => null, 'retry' => false, 'labels' => [], 'locale' => null, 'action' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'metric' => 'المؤشر', 'compare' => 'مقارنة بالفترة السابقة', 'previousPeriod' => 'الفترة السابقة', 'total' => 'الإجمالي', 'average' => 'المتوسط',
        'empty' => 'لا بيانات لهذه الفترة', 'chart' => '%1$s، من %2$s إلى %3$s', 'loadError' => 'تعذّر تحميل الرسم البياني.', 'retry' => 'حاول مرة أخرى',
    ] : [
        'metric' => 'Metric', 'compare' => 'Compare with previous period', 'previousPeriod' => 'Previous period', 'total' => 'Total', 'average' => 'Average',
        'empty' => 'No data for this period', 'chart' => '%1$s, %2$s to %3$s', 'loadError' => 'The chart could not be loaded.', 'retry' => 'Try again',
    ], $labels);
    $data = array_values($data);
    $previousData = array_values($previousData);
    $metrics = array_values($metrics);
    $hasPrevious = count($previousData) > 0;
    $compareOn = (bool) $compare && $hasPrevious;
    $activeId = collect($metrics)->contains('id', $metric) ? $metric : ($metrics[0]['id'] ?? '');
    $tones = ['success' => 'var(--nq-success)', 'warning' => 'var(--nq-warning)', 'danger' => 'var(--nq-danger)'];
    $showChart = ! $loading && ! $error && count($metrics) > 0 && count($data) > 0;
    $blocks = [];
    if ($showChart) {
        foreach ($metrics as $m) {
            $id = $m['id'];
            $rev = (bool) ($m['lowerIsBetter'] ?? false);
            $mode = $m['aggregate'] ?? 'sum';
            $format = $m['format'] ?? [];
            $cur = [];
            $prev = [];
            foreach ($data as $i => $p) {
                $cur[] = (float) ($p[$id] ?? 0);
                $prev[] = isset($previousData[$i]) ? (float) ($previousData[$i][$id] ?? 0) : null;
            }
            $agg = fn (array $v) => count($v) === 0 ? 0 : ($mode === 'avg' ? array_sum($v) / count($v) : array_sum($v));
            $total = $agg($cur);
            $delta = $hasPrevious ? nq_mt_change_ratio($total, $agg(array_values(array_filter($prev, fn ($v) => $v !== null)))) : null;
            $good = $delta === null || $delta == 0 ? null : (($delta > 0) !== $rev);
            $domain = nq_ts_domain(array_merge($cur, array_values(array_filter($prev, fn ($v) => $v !== null))), $rev);
            $n = count($cur);
            $color = $m['color'] ?? 'var(--primary)';
            $withTime = str_contains((string) ($data[0]['date'] ?? ''), 'T');
            $fmtDate = fn (string $d) => nq_ts_date($d, $locale, $dateFormat);
            $tips = [];
            foreach ($data as $i => $p) {
                $rows = [['k' => 'current', 'label' => $m['label'], 'color' => 'var(--color-current)', 'text' => nq_mt_number($cur[$i], $format, $locale)]];
                if ($prev[$i] !== null) {
                    $rows[] = ['k' => 'previous', 'label' => $t['previousPeriod'], 'color' => 'var(--color-previous)', 'text' => nq_mt_number($prev[$i], $format, $locale)];
                }
                $tips[] = ['x' => nq_ts_x($i, $n), 'y' => nq_ts_y($cur[$i], $domain, $rev), 'date' => $fmtDate((string) $p['date']), 'rows' => $rows];
            }
            $first = (string) $data[0]['date'];
            $last = (string) $data[$n - 1]['date'];
            $blocks[] = [
                'id' => $id, 'label' => $m['label'], 'mode' => $mode, 'format' => $format, 'rev' => $rev, 'color' => $color,
                'total' => $total, 'delta' => $delta, 'good' => $good, 'domain' => $domain, 'n' => $n,
                'current' => nq_ts_paths($cur, $domain, $rev), 'previous' => nq_ts_paths($prev, $domain, $rev), 'hasPrev' => collect($prev)->contains(fn ($v) => $v !== null),
                'tips' => $tips,
                'chartLabel' => sprintf($t['chart'], $m['label'], nq_ts_date($first, $locale, $dateFormat, false), nq_ts_date($last, $locale, $dateFormat, false)),
                'xLabels' => array_map(fn ($i) => ['i' => $i, 'text' => $fmtDate((string) $data[$i]['date'])], nq_ts_label_indices($n)),
                'guides' => array_values(array_filter($referenceLines, fn ($r) => $r['value'] >= min($domain['lo'], $domain['hi']) && $r['value'] <= $domain['hi'])),
            ];
        }
    }
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'time-series-panel') }}" @if ($loading) aria-busy="true" @endif x-data="nqTimeSeriesPanel(@js($activeId), @js($compareOn))"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground') }}>
    <x-nq::card.header>
        @if ($title)<x-nq::card.title as="h3">{{ $title }}</x-nq::card.title>@endif
        @if ($description)<x-nq::card.description>{{ $description }}</x-nq::card.description>@endif
        @if ($action && ! $action->isEmpty())<x-nq::card.action>{{ $action }}</x-nq::card.action>@endif
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            @if (count($metrics) > 1)
                <div class="max-w-full overflow-x-auto">
                    <x-nq::toggle-group :default-value="[$activeId]" :aria-label="$t['metric']" x-model="pressed">
                        @foreach ($metrics as $m)
                            <x-nq::toggle-group.toggle :value="$m['id']">{{ $m['label'] }}</x-nq::toggle-group.toggle>
                        @endforeach
                    </x-nq::toggle-group>
                </div>
            @endif
            @if ($hasPrevious)
                <label class="flex items-center gap-2 text-body-sm text-muted-foreground">
                    <x-nq::switch :checked="$compareOn" x-model="compare" />
                    {{ $t['compare'] }}
                </label>
            @endif
        </div>
        @if ($error)
            <x-nq::states.error :title="is_string($error) ? $error : $t['loadError']">
                @if ($retry)
                    <x-slot:actions><x-nq::button size="sm" x-on:click="$dispatch('nq-retry')">{{ $t['retry'] }}</x-nq::button></x-slot:actions>
                @endif
            </x-nq::states.error>
        @elseif ($loading)
            <x-nq::states.skeleton class="w-full {{ $chartClassName }}" />
        @elseif (! $showChart)
            <div class="grid place-items-center text-body-sm text-muted-foreground {{ $chartClassName }}">{{ $t['empty'] }}</div>
        @else
            @foreach ($blocks as $b)
                @php
                    $on = $b['id'] === $activeId;
                    $deltaTone = $b['good'] === null ? 'text-muted-foreground' : ($b['good'] ? 'text-nq-success-text' : 'text-nq-danger-text');
                    $deltaText = null;
                    if ($b['delta'] !== null) {
                        $deltaText = nq_mt_number($b['delta'], ['style' => 'percent', 'maxFraction' => 1], $locale);
                        if ($b['delta'] > 0 && ! str_starts_with($deltaText, '+')) {
                            $deltaText = '+'.$deltaText;
                        }
                    }
                    $gid = 'nq-ts-'.substr(md5($b['id'].json_encode($b['current'])), 0, 8);
                    $rev = $b['rev'];
                    $isPct = ($b['format']['style'] ?? null) === 'percent';
                @endphp
                <div class="contents" data-metric="{{ $b['id'] }}" x-show="metric === @js($b['id'])" @unless ($on) style="display: none" @endunless>
                    <div data-slot="time-series-total" class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span class="text-caption text-muted-foreground">{{ $b['mode'] === 'avg' ? $t['average'] : $t['total'] }}</span>
                        <span class="text-h2 text-foreground tabular-nums">
                            <x-nq::numeric :value="$b['total']" :style="$b['format']['style'] ?? 'decimal'" :currency="$b['format']['currency'] ?? null" :compact="$b['format']['compact'] ?? false" :min-fraction="$b['format']['minFraction'] ?? null" :max-fraction="$b['format']['maxFraction'] ?? 1" :locale="$locale" />
                        </span>
                        @if ($deltaText !== null)
                            <span class="text-label {{ $deltaTone }}" x-show="compare" @unless ($compareOn) style="display: none" @endunless>
                                <bdi data-slot="num" data-numeric="" class="tabular-nums">{{ $deltaText }}</bdi>
                            </span>
                        @endif
                    </div>
                    <x-nq::chart :config="['current' => ['label' => $b['label'], 'color' => $b['color']], 'previous' => ['label' => $t['previousPeriod'], 'color' => 'var(--muted-foreground)']]"
                        :label="$b['chartLabel']" class="aspect-auto flex-col justify-start gap-2 {{ $chartClassName }}">
                        <div class="flex min-h-0 flex-1 gap-2">
                            <div aria-hidden="true" class="relative w-11 shrink-0 text-end text-muted-foreground">
                                @foreach ($b['domain']['ticks'] as $tick)
                                    <span class="absolute inset-x-0 -translate-y-1/2 truncate" style="top: {{ nq_ts_y($tick, $b['domain'], $rev) }}%">
                                        @if ($isPct)
                                            <x-nq::numeric :value="$tick" style="percent" :max-fraction="1" :locale="$locale" />
                                        @else
                                            <x-nq::numeric :value="$tick" compact :max-fraction="1" :locale="$locale" />
                                        @endif
                                    </span>
                                @endforeach
                            </div>
                            <div data-slot="time-series-plot" class="relative min-w-0 flex-1" x-data="nqTimeSeriesChart(@js($b['tips']))" x-on:pointermove="move($event)" x-on:pointerleave="leave()">
                                @foreach ($b['domain']['ticks'] as $tick)
                                    <span aria-hidden="true" class="absolute inset-x-0 border-t border-border" style="top: {{ nq_ts_y($tick, $b['domain'], $rev) }}%"></span>
                                @endforeach
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false" class="absolute inset-0 size-full overflow-visible rtl:-scale-x-100">
                                    <defs>
                                        <linearGradient id="{{ $gid }}" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" style="stop-color: var(--color-current); stop-opacity: 0.28" />
                                            <stop offset="100%" style="stop-color: var(--color-current); stop-opacity: 0.02" />
                                        </linearGradient>
                                    </defs>
                                    @foreach ($b['guides'] as $g)
                                        @php $gy = nq_ts_y($g['value'], $b['domain'], $rev); @endphp
                                        <line x1="0" x2="100" y1="{{ $gy }}" y2="{{ $gy }}" stroke="{{ $tones[$g['tone'] ?? 'warning'] ?? $tones['warning'] }}" stroke-dasharray="2 4" vector-effect="non-scaling-stroke" />
                                    @endforeach
                                    @if ($b['hasPrev'] && $b['previous']['line'] !== '')
                                        <path data-slot="time-series-previous" x-show="compare" @unless ($compareOn) style="display: none" @endunless d="{{ $b['previous']['line'] }}" fill="none" stroke="var(--color-previous)" stroke-dasharray="4 4" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
                                    @endif
                                    <path d="{{ $b['current']['area'] }}" fill="url(#{{ $gid }})" stroke="none" />
                                    <path data-slot="time-series-current" d="{{ $b['current']['line'] }}" fill="none" stroke="var(--color-current)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" />
                                </svg>
                                @foreach ($b['guides'] as $g)
                                    <span aria-hidden="true" class="absolute end-0 -translate-y-full text-[11px]" style="top: {{ nq_ts_y($g['value'], $b['domain'], $rev) }}%; color: {{ $tones[$g['tone'] ?? 'warning'] ?? $tones['warning'] }}">{{ $g['label'] }}</span>
                                @endforeach
                                <div class="contents" x-show="hover !== null" style="display: none">
                                    <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 w-px bg-border" x-bind:style="lineStyle"></span>
                                    <span aria-hidden="true" data-slot="chart-dot" class="pointer-events-none absolute size-2 -translate-y-1/2 rounded-full bg-[var(--color-current)] ltr:-translate-x-1/2 rtl:translate-x-1/2" x-bind:style="dotStyle"></span>
                                    <div class="pointer-events-none absolute top-0 z-10 ltr:-translate-x-1/2 rtl:translate-x-1/2" x-bind:style="tipStyle">
                                        <div data-slot="chart-tooltip" dir="{{ $ar ? 'rtl' : 'ltr' }}" class="grid min-w-32 gap-1.5 rounded-control border border-border bg-popover px-2.5 py-1.5 text-caption text-popover-foreground shadow-md">
                                            <div class="text-label" x-text="tip.date"></div>
                                            <div class="grid gap-1">
                                                <template x-for="row in tip.rows" x-bind:key="row.k">
                                                    <div class="flex items-center gap-2" x-show="row.k === 'current' || compare">
                                                        <span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px]" x-bind:style="{ backgroundColor: row.color }"></span>
                                                        <span class="text-muted-foreground" x-text="row.label"></span>
                                                        <span class="ms-auto ps-3 text-label tabular-nums" x-text="row.text"></span>
                                                    </div>
                                                </template>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div aria-hidden="true" class="relative h-4 ms-[3.25rem]">
                            @foreach ($b['xLabels'] as $x)
                                @php $edge = $x['i'] === 0 || $x['i'] === $b['n'] - 1; @endphp
                                <span class="absolute top-0 whitespace-nowrap {{ $x['i'] === 0 ? 'start-0' : ($x['i'] === $b['n'] - 1 ? 'end-0' : 'ltr:-translate-x-1/2 rtl:translate-x-1/2') }}"
                                    @unless ($edge) style="inset-inline-start: {{ nq_ts_x($x['i'], $b['n']) }}%" @endunless>{{ $x['text'] }}</span>
                            @endforeach
                        </div>
                    </x-nq::chart>
                </div>
            @endforeach
        @endif
    </x-nq::card.content>
</div>
