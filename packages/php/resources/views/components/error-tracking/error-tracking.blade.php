{{-- <x-nq::error-tracking :issues="$issues" can-change x-on:nq-error-status="$event.detail.waitUntil(save($event.detail.id, $event.detail.status))" />
     Captured errors: a list with a frequency sparkline per error (in the card view), filters by status and level, and the detail of the one you open (stack trace,
     breadcrumbs, tags, diagnostics) with resolve and ignore. Rows and cards open the same actions from the ⋯ menu and the context menu. It holds no data. Built on
     x-nq::entity-list (search, filters, table and card views, paging) and x-nq::error-tracking.detail.
     issues: [['id', 'title', 'culprit', 'level' => fatal|error|warning|info, 'status' => unresolved|resolved|ignored, 'count', 'users', 'firstSeen', 'lastSeen',
     'series' => [n, …] (events per bucket, oldest first), 'release', 'environment', 'tags', 'frames', 'breadcrumbs', 'diagnostics'], ...]: see x-nq::error-tracking.detail.
     can-change (default false): Resolve / Ignore / Reopen in the detail and the row menu. open: an id to start with its detail open. now: pins "now" (tests, docs).
     label: the list's accessible name. page-size: rows per page (0 = all). loading, error: passed to the list. labels: override any string. locale: en or ar.
     Slot: empty (when there are no issues). Table cells are text here (the entity list's cells are text): the sparkline is in the card view and the detail.
     Bubbling events: "nq-error-open" { id }, "nq-error-status" { id, status, previous, waitUntil(promise) }: await your API inside waitUntil; resolve { error: '…' } or reject to
     keep the old status and show why. Alpine members in scope: openIssue(id), back(), changeStatus(id, status), statusOf(id), entries, openId, busy, failure.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['issues' => [], 'canChange' => false, 'open' => null, 'now' => null, 'label' => null, 'pageSize' => 0, 'loading' => false, 'error' => null, 'labels' => [], 'locale' => null])
@include('nasaq::components.error-tracking._logic')
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = nq_et_words($locale, (array) $labels);
    $nowDate = $now ? \Carbon\CarbonImmutable::parse($now) : \Carbon\CarbonImmutable::now();
    $list = array_values(array_map(fn ($i) => (array) $i, (array) $issues));
    $rank = ['fatal' => 0, 'error' => 1, 'warning' => 2, 'info' => 3];
    $trendColor = ['up' => 'var(--nq-danger)', 'down' => 'var(--nq-success)', 'flat' => 'var(--primary)'];
    $rows = collect($list)->map(function ($i) use ($t, $locale, $ar, $nowDate, $rank, $trendColor) {
        $series = array_values((array) ($i['series'] ?? []));
        $trend = nq_et_trend($series);
        $spark = $series
            ? \Illuminate\Support\Facades\Blade::render('<x-nq::chart.sparkline :data="$series" :color="$color" :label="$label" class="h-10 w-full" />', [
                'series' => $series, 'color' => $trendColor[$trend], 'label' => str_replace('{n}', nq_et_num(nq_et_total($series), $locale), $t['frequencyLabel']),
            ])
            : '';

        return [
            'id' => (string) $i['id'], 'title' => $i['title'], 'culprit' => $i['culprit'] ?? '', 'level' => $i['level'], 'levelText' => $t['levels'][$i['level']] ?? $i['level'],
            'status' => $i['status'], 'statusText' => $t['statuses'][$i['status']] ?? $i['status'], 'trend' => $series ? ($trend === 'up' ? $t['trendUp'] : ($trend === 'down' ? $t['trendDown'] : $t['trendFlat'])) : '—',
            'events' => nq_et_num($i['count'] ?? 0, $locale), 'users' => isset($i['users']) ? nq_et_num($i['users'], $locale) : '—',
            'lastSeenText' => nq_et_ago($i['lastSeen'], $nowDate, $ar), 'spark' => $spark, 'release' => $i['release'] ?? '',
            'rank' => $rank[$i['level']] ?? 9, 'ts' => \Carbon\CarbonImmutable::parse($i['lastSeen'])->getTimestamp(),
        ];
    })->sortBy([fn ($a, $b) => ($a['status'] === 'unresolved' ? 0 : 1) <=> ($b['status'] === 'unresolved' ? 0 : 1), fn ($a, $b) => $a['rank'] <=> $b['rank'], fn ($a, $b) => $b['ts'] <=> $a['ts']])->values()->all();
    $actions = array_values(array_filter([
        ['id' => 'open', 'label' => $t['open'], 'icon' => 'bug'],
        $canChange ? ['id' => 'resolve', 'label' => $t['resolve'], 'icon' => 'check-check', 'group' => 'status'] : null,
        $canChange ? ['id' => 'ignore', 'label' => $t['ignore'], 'icon' => 'eye-off', 'group' => 'status'] : null,
        $canChange ? ['id' => 'reopen', 'label' => $t['reopen'], 'icon' => 'rotate-ccw', 'group' => 'status'] : null,
    ]));
    $facets = [
        ['id' => 'status', 'title' => $t['status'], 'key' => 'status', 'options' => array_map(fn ($v) => ['value' => $v, 'label' => $t['statuses'][$v]], ['unresolved', 'resolved', 'ignored'])],
        ['id' => 'level', 'title' => $t['level'], 'key' => 'level', 'options' => array_map(fn ($v) => ['value' => $v, 'label' => $t['levels'][$v]], ['fatal', 'error', 'warning', 'info'])],
    ];
    $config = ['rows' => $rows, 'openId' => $open !== null ? (string) $open : null, 'texts' => ['errorFailed' => $t['errorFailed'], 'statuses' => $t['statuses']]];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'error-tracking') }}" x-data="nqErrorTracking({!! \Illuminate\Support\Js::from($config)->toHtml() !!})"
    x-on:nq-entity-list-row-click="openIssue($event.detail.row.id)" x-on:nq-entity-list-action="onAction($event.detail)"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <div x-show="openId === null" @if ($open !== null) style="display: none" @endif>
        <x-nq::entity-list :label="$label ?? $t['label']" :search="$t['search']" :columns="[
                ['id' => 'title', 'header' => $t['error'], 'sortable' => true, 'searchable' => true],
                ['id' => 'culprit', 'header' => $t['culprit'], 'sortable' => true, 'searchable' => true],
                ['id' => 'level', 'key' => 'levelText', 'header' => $t['level'], 'sortable' => true],
                ['id' => 'status', 'key' => 'statusText', 'header' => $t['status'], 'sortable' => true],
                ['id' => 'frequency', 'key' => 'trend', 'header' => $t['frequency']],
                ['id' => 'events', 'header' => $t['events'], 'align' => 'end'],
                ['id' => 'lastSeen', 'key' => 'lastSeenText', 'header' => $t['lastSeen'], 'align' => 'end'],
            ]" :rows="$rows" :facets="$facets" :row-actions="$actions" :selectable="false" :page-size="$pageSize" :loading="$loading" :error="$error" x-model="entries">
            <x-slot:card>
                <div class="flex min-w-0 flex-col gap-3">
                    <div class="flex min-w-0 flex-col gap-1 pe-(--entity-card-controls)">
                        <span dir="auto" class="line-clamp-2 text-label text-foreground" x-text="row.title"></span>
                        <bdi dir="ltr" class="truncate font-mono text-code text-muted-foreground" x-show="row.culprit" x-text="row.culprit"></bdi>
                    </div>
                    <div x-show="row.spark" x-html="row.spark"></div>
                    <div class="flex flex-col gap-1.5">
                        <div class="flex items-center justify-between gap-3 text-body-sm"><span class="text-muted-foreground">{{ $t['level'] }}</span><span class="text-foreground" x-text="row.levelText"></span></div>
                        <div class="flex items-center justify-between gap-3 text-body-sm"><span class="text-muted-foreground">{{ $t['status'] }}</span><span class="text-foreground" x-text="row.statusText"></span></div>
                        <div class="flex items-center justify-between gap-3 text-body-sm"><span class="text-muted-foreground">{{ $t['events'] }}</span><span class="tabular-nums text-foreground" x-text="row.events"></span></div>
                        <div class="flex items-center justify-between gap-3 text-body-sm"><span class="text-muted-foreground">{{ $t['lastSeen'] }}</span><span class="text-foreground" x-text="row.lastSeenText"></span></div>
                    </div>
                </div>
            </x-slot:card>
            <x-slot:empty>
                @if (isset($empty) && ! $empty->isEmpty()){{ $empty }}@else<x-nq::states.empty icon="bug" :title="$t['empty']" :description="$t['emptyHint']" />@endif
            </x-slot:empty>
        </x-nq::entity-list>
    </div>
    @foreach ($list as $i)
        <x-nq::error-tracking.detail :issue="$i" :can-change="$canChange" show-back :now="$nowDate->toIso8601String()" :labels="$labels" :locale="$locale"
            x-show="openId === '{{ $i['id'] }}'" :style="(string) $open === (string) $i['id'] ? '' : 'display: none'" />
    @endforeach
</div>
