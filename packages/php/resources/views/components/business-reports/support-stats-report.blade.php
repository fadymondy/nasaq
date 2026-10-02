{{-- <x-nq::business-reports.support-stats-report :summary="['open' => 42, 'firstResponseMinutes' => 38, 'resolutionMinutes' => 310, 'csat' => 0.92, 'slaRate' => 0.87]" :volume="[['date' => '2026-09-28', 'created' => 27, 'resolved' => 30]]" :by-status="[['id' => 'open', 'label' => 'Open', 'value' => 42]]" :agents="[['id' => 'a1', 'name' => 'Omar', 'assigned' => 60, 'resolved' => 52, 'firstResponseMinutes' => 25, 'csat' => 0.94]]" />
     The inbox at a glance: response and resolution times, satisfaction and SLA, volume over time, status mix and a table of agents.
     summary: open, firstResponseMinutes and resolutionMinutes (medians), csat and slaRate (fractions 0 to 1), optional deltas (['open' | 'firstResponse' | 'resolution' | 'csat' | 'sla' => fraction]).
     volume: one row per day with date, created and resolved; previous-volume: the comparison period. by-status: id, label, value (colour optional). agents: id, name, assigned, resolved, firstResponseMinutes, csat, optional trend (resolved per period, oldest first).
     agent-actions: the agent rows' menu ([['id' => 'open', 'label' => 'Open', 'icon' => 'user']]), opened by the ⋯ button, right-click, long press or Shift+F10, dispatching the bubbling "nq-data-table-action" ({ action, row }).
     loading, labels: array overriding the built-in words. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.business-reports._logic')
@props(['summary' => [], 'volume' => [], 'previousVolume' => [], 'byStatus' => [], 'agents' => [], 'agentActions' => [], 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_br_words($locale, $labels);
    $d = $summary['deltas'] ?? [];
    $whole = ['style' => 'percent', 'maxFraction' => 0];
    $percent = fn ($v) => nq_br_number($v, $whole, $locale);
    $agents = array_values($agents);
    $cols = [
        ['id' => 'name', 'header' => $t['agent'], 'key' => 'name', 'sortable' => true, 'searchable' => true],
        ['id' => 'assigned', 'header' => $t['assigned'], 'key' => 'assignedText', 'sortKey' => 'assigned', 'sortable' => true, 'align' => 'end'],
        ['id' => 'resolved', 'header' => $t['resolvedShort'], 'key' => 'resolvedText', 'sortKey' => 'resolved', 'sortable' => true, 'align' => 'end'],
        ['id' => 'first', 'header' => $t['firstResponse'], 'key' => 'firstText', 'sortKey' => 'first', 'sortable' => true, 'align' => 'end'],
        ['id' => 'csat', 'header' => $t['csat'], 'key' => 'csatText', 'sortKey' => 'csat', 'sortable' => true, 'align' => 'end'],
    ];
    $tableRows = array_map(fn ($a) => [
        'id' => (string) $a['id'], 'name' => $a['name'],
        'assigned' => $a['assigned'], 'assignedText' => nq_br_number($a['assigned'], ['maxFraction' => 0], $locale),
        'resolved' => $a['resolved'], 'resolvedText' => nq_br_number($a['resolved'], ['maxFraction' => 0], $locale),
        'first' => $a['firstResponseMinutes'], 'firstText' => nq_br_duration($a['firstResponseMinutes'], $locale),
        'csat' => $a['csat'], 'csatText' => $percent($a['csat']), 'trendRow' => ! empty($a['trend']),
    ], $agents);
    $withTrend = array_values(array_filter($agents, fn ($a) => ! empty($a['trend'])));
    $metrics = [['id' => 'created', 'label' => $t['created'], 'color' => 'var(--nq-info)'], ['id' => 'resolved', 'label' => $t['resolved'], 'color' => 'var(--nq-success)']];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'support-stats-report') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <x-nq::stat-card.grid>
        <x-nq::stat-card :label="$t['open']" :value="$summary['open'] ?? 0" :delta="$d['open'] ?? null" invert :loading="$loading" :locale="$locale" />
        <x-nq::stat-card :label="$t['firstResponse']" :delta="$d['firstResponse'] ?? null" invert :loading="$loading" :locale="$locale"><bdi data-slot="num" data-numeric class="tabular-nums">{{ nq_br_duration($summary['firstResponseMinutes'] ?? 0, $locale) }}</bdi></x-nq::stat-card>
        <x-nq::stat-card :label="$t['resolution']" :delta="$d['resolution'] ?? null" invert :loading="$loading" :locale="$locale"><bdi data-slot="num" data-numeric class="tabular-nums">{{ nq_br_duration($summary['resolutionMinutes'] ?? 0, $locale) }}</bdi></x-nq::stat-card>
        <x-nq::stat-card :label="$t['csat']" :value="$summary['csat'] ?? 0" :format="$whole" :delta="$d['csat'] ?? null" :loading="$loading" :locale="$locale" />
        <x-nq::stat-card :label="$t['sla']" :value="$summary['slaRate'] ?? 0" :format="$whole" :delta="$d['sla'] ?? null" :loading="$loading" :locale="$locale" />
    </x-nq::stat-card.grid>
    <x-nq::time-series-panel :title="$t['volume']" :metrics="$metrics" :data="$volume" :previous-data="$previousVolume" metric="created" :loading="$loading" :locale="$locale" />
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <x-nq::card class="w-full">
            <x-nq::card.header><x-nq::card.title>{{ $t['byStatus'] }}</x-nq::card.title></x-nq::card.header>
            <x-nq::card.content><x-nq::chart-extras.segment-bar :label="$t['byStatus']" :segments="$byStatus" patterned :locale="$locale" /></x-nq::card.content>
        </x-nq::card>
        <div class="flex min-w-0 flex-col gap-2">
            <h3 class="text-label font-medium">{{ $t['agents'] }}</h3>
            <x-nq::data-table :label="$t['agents']" name-key="name" :columns="$cols" :rows="$tableRows" :page-size="8" :search="false" :view-options="false"
                :row-actions="$agentActions" :loading="$loading" :labels="['empty' => $t['empty']]" :locale="$locale">
                @if ($withTrend)
                    <x-slot name="cell_resolved">
                        <span x-show="row.trendRow !== true" x-text="row.resolvedText"></span>
                        @foreach ($withTrend as $a)
                            <span x-show="row.id === `{{ $a['id'] }}`" style="display: none">
                                <x-nq::chart-extras.trend-cell :value="$a['resolved']" :data="$a['trend']" :chart-label="$t['resolvedShort'].': '.$a['name']" :locale="$locale" />
                            </span>
                        @endforeach
                    </x-slot>
                @endif
            </x-nq::data-table>
        </div>
    </div>
</section>
