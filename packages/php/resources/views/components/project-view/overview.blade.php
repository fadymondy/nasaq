{{-- <x-nq::project-view.overview :issues="$issues" :statuses="$statuses" :activity="$activity" :budget="['total' => 12000, 'spent' => 4800]" today="2026-09-29" />
     The Overview tab of x-nq::project-view: open, done, overdue and progress tiles, open issues by status, a burndown, recent activity and the budget against spend.
     issues: [['id', 'statusId', 'dueDate', 'createdAt', 'completedAt']] as for x-nq::issue-view. statuses: [['id', 'name', 'hue', 'stage']].
     activity: [['id', 'title', 'description', 'at', 'actor' => ['name']]]. budget: ['total', 'spent', 'currency'] or null. today: the civil "Y-m-d" the overdue count and the burndown stop at.
     start / end: the burndown range (default 14 days back to the last due date, or a week ahead). text: array overriding the words (see x-nq::project-view). locale: default the app locale.
     Both charts are drawn by hand (flex bars and one SVG), with no chart library. Static: re-render after a change. --}}
@include('nasaq::components.project-view._logic')
@props(['issues' => [], 'statuses' => [], 'activity' => [], 'budget' => null, 'today', 'start' => null, 'end' => null, 'text' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = nq_pv_words($locale, (array) $text);
    $issues = array_values((array) $issues);
    $statuses = array_values((array) $statuses);
    $totals = nq_pv_totals($issues, $statuses, $today);
    $counts = nq_pv_status_counts($issues, $statuses);
    $dues = collect($issues)->pluck('dueDate')->filter()->sort()->values();
    $s = $start ?? nq_pv_add_days($today, -13);
    $last = $dues->last();
    $e = $end ?? ($last && $last > $today ? $last : nq_pv_add_days($today, 7));
    $points = nq_pv_burndown($issues, $s, $e, $today);
    $day = fn ($key) => nq_pv_date($key, $ar, false);
    $statusOf = collect($statuses)->keyBy('id');
    $statusData = collect($counts)->filter(fn ($c) => ! in_array($statusOf[$c['statusId']]['stage'] ?? null, ['done', 'canceled'], true))->map(function ($c) use ($statusOf) {
        $st = $statusOf[$c['statusId']] ?? null;

        return ['name' => $st['name'] ?? $c['statusId'], 'count' => $c['count'], 'fill' => 'var(--nq-tag-'.($st['hue'] ?? 'gray').')'];
    })->values();
    $maxCount = max(1, $statusData->max('count') ?? 1);
    $burnMax = max(1, collect($points)->map(fn ($p) => max($p['remaining'] ?? 0, $p['ideal']))->max() ?? 1);
    $n = fn ($v) => rtrim(rtrim(number_format((float) $v, 1, '.', ''), '0'), '.');
    $xy = fn ($i, $v) => $n(count($points) > 1 ? $i / (count($points) - 1) * 100 : 0).','.$n(100 - ($v / $burnMax) * 96 - 2);
    $remainingLine = collect($points)->flatMap(fn ($p, $i) => $p['remaining'] === null ? [] : [$xy($i, $p['remaining'])])->implode(' ');
    $idealLine = collect($points)->map(fn ($p, $i) => $xy($i, $p['ideal']))->implode(' ');
    $currency = $budget['currency'] ?? \Nasaq\Nasaq::currency($locale);
    $money = fn ($v) => nq_pv_money($v, $currency, $locale);
    $b = $budget ? nq_pv_budget($budget['total'] ?? null, $budget['spent'] ?? 0) : null;
    $activity = array_slice(array_values((array) $activity), 0, 6);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'project-overview') }}" {{ $attributes->except('data-slot')->cn('@container flex min-w-0 flex-col gap-4') }}>
    <x-nq::stat-card.grid>
        <x-nq::stat-card :label="$t['open']" :value="$totals['open']" :locale="$locale"><x-slot:icon><x-lucide-circle-dot /></x-slot:icon></x-nq::stat-card>
        <x-nq::stat-card :label="$t['done']" :value="$totals['done']" :locale="$locale"><x-slot:icon><x-lucide-circle-check /></x-slot:icon></x-nq::stat-card>
        <x-nq::stat-card :label="$t['overdue']" :value="$totals['overdue']" invert :locale="$locale"><x-slot:icon><x-lucide-triangle-alert /></x-slot:icon></x-nq::stat-card>
        <x-nq::stat-card :label="$t['progress']" :value="$totals['percent'] / 100" :format="['style' => 'percent', 'maxFraction' => 0]" :locale="$locale"><x-slot:icon><x-lucide-clock /></x-slot:icon></x-nq::stat-card>
    </x-nq::stat-card.grid>

    <div class="grid min-w-0 gap-4 @3xl:grid-cols-2">
        <x-nq::card>
            <x-nq::card.header>
                <x-nq::card.title as="h3" class="text-h3">{{ $t['byStatus'] }}</x-nq::card.title>
                <x-nq::card.description>{{ $t['byStatusHint'] }}</x-nq::card.description>
            </x-nq::card.header>
            <x-nq::card.content>
                <div data-slot="project-status-chart" role="img" aria-label="{{ $t['byStatus'] }}. {{ $statusData->map(fn ($d) => $d['name'].' '.$d['count'])->implode(', ') }}" class="flex h-56 items-stretch gap-2">
                    @foreach ($statusData as $d)
                        <div class="flex min-w-0 flex-1 flex-col items-center gap-1">
                            <div class="flex min-h-0 w-full flex-1 items-end border-b border-border">
                                <div class="w-full rounded-t-[3px]" style="height: {{ $n($d['count'] / $maxCount * 100) }}%; background: {{ $d['fill'] }}"></div>
                            </div>
                            <span class="text-caption tabular-nums text-foreground"><x-nq::numeric :value="$d['count']" :locale="$locale" /></span>
                            <span class="w-full truncate text-center text-[11px] text-muted-foreground">{{ $d['name'] }}</span>
                        </div>
                    @endforeach
                </div>
            </x-nq::card.content>
        </x-nq::card>

        <x-nq::card>
            <x-nq::card.header>
                <x-nq::card.title as="h3" class="text-h3">{{ $t['burndown'] }}</x-nq::card.title>
                <x-nq::card.description>{{ $t['burndownHint'] }}</x-nq::card.description>
            </x-nq::card.header>
            <x-nq::card.content>
                <div data-slot="project-burndown" role="img" aria-label="{{ $t['burndown'] }}. {{ $s }} - {{ $e }}" class="flex flex-col gap-1">
                    <div class="relative h-56">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" class="absolute inset-0 size-full overflow-visible rtl:-scale-x-100">
                            @foreach ([0, 25, 50, 75, 100] as $g)
                                <line x1="0" x2="100" y1="{{ $g }}" y2="{{ $g }}" stroke="var(--border)" stroke-width="1" vector-effect="non-scaling-stroke" />
                            @endforeach
                            <polyline points="{{ $idealLine }}" fill="none" stroke="var(--muted-foreground)" stroke-width="1.5" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" />
                            <polyline points="{{ $remainingLine }}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
                        </svg>
                        <span class="absolute start-0 top-0 text-caption tabular-nums text-muted-foreground"><x-nq::numeric :value="$burnMax" :locale="$locale" /></span>
                    </div>
                    <div class="flex justify-between text-caption text-muted-foreground"><span>{{ $day($s) }}</span><span>{{ $day($e) }}</span></div>
                </div>
                <ul class="m-0 mt-2 flex list-none justify-center gap-4 p-0 text-caption text-muted-foreground">
                    <li class="flex items-center gap-1.5"><span aria-hidden="true" class="h-0.5 w-4 bg-primary"></span>{{ $t['remaining'] }}</li>
                    <li class="flex items-center gap-1.5"><span aria-hidden="true" class="w-4 border-t-2 border-dashed border-muted-foreground"></span>{{ $t['ideal'] }}</li>
                </ul>
            </x-nq::card.content>
        </x-nq::card>

        <x-nq::card>
            <x-nq::card.header>
                <x-nq::card.title as="h3" class="text-h3">{{ $t['recent'] }}</x-nq::card.title>
            </x-nq::card.header>
            <x-nq::card.content>
                @if (count($activity) === 0)
                    <x-nq::states.empty :title="$t['noActivity']" />
                @else
                    <x-nq::timeline aria-label="{{ $t['recent'] }}" :locale="$locale">
                        @foreach ($activity as $a)
                            <x-nq::timeline.item :actor="$a['actor'] ?? null" :title="$a['title']" :description="$a['description'] ?? null" :time="$a['at']" />
                        @endforeach
                    </x-nq::timeline>
                @endif
            </x-nq::card.content>
        </x-nq::card>

        <x-nq::card>
            <x-nq::card.header>
                <x-nq::card.title as="h3" class="text-h3">{{ $t['budget'] }}</x-nq::card.title>
                <x-nq::card.description>{{ $t['budgetHint'] }}</x-nq::card.description>
            </x-nq::card.header>
            <x-nq::card.content class="flex flex-col gap-3">
                @if ($budget && $b)
                    <x-nq::progress.meter :label="$t['budget']" :value="min($budget['spent'], $budget['total'])" :max="$budget['total']" size="md" :show-value="false" :locale="$locale" />
                    <dl class="m-0 grid grid-cols-3 gap-3">
                        <div>
                            <dt class="text-caption text-muted-foreground">{{ $t['spent'] }}</dt>
                            <dd class="m-0 text-body font-semibold"><bdi>{{ $money($budget['spent']) }}</bdi></dd>
                        </div>
                        <div>
                            <dt class="text-caption text-muted-foreground">{{ $b['over'] ? $t['over'] : $t['left'] }}</dt>
                            <dd class="{{ $b['over'] ? 'm-0 text-body font-semibold text-nq-danger-text' : 'm-0 text-body font-semibold' }}"><bdi>{{ $money(abs($b['remaining'])) }}</bdi></dd>
                        </div>
                        <div>
                            <dt class="text-caption text-muted-foreground">{{ $t['budget'] }}</dt>
                            <dd class="m-0 text-body font-semibold"><bdi>{{ $money($budget['total']) }}</bdi></dd>
                        </div>
                    </dl>
                @else
                    <p class="m-0 text-body-sm text-muted-foreground">{{ $t['noBudget'] }}</p>
                @endif
            </x-nq::card.content>
        </x-nq::card>
    </div>
</div>
