{{-- <x-nq::heatmap :data="[['date' => '2026-09-27', 'count' => 3], ['date' => '2026-09-29', 'count' => 1]]" to="2026-09-29" label="Commits by day" />
     A contribution grid: one cell per day, one column per week, five intensity levels of one colour. Time runs against the reading direction, so
     right to left in Arabic. data: array of ['date' => 'YYYY-MM-DD' or DateTime, 'count']; several entries for one day are summed. from / to: the range
     (default: 52 weeks up to today). color: any CSS colour, normally a token (var(--nq-tag-teal)), default var(--primary). thresholds: [1, 4, 8, 12], the
     smallest counts of levels 1 to 4 (default: quarters of the busiest day). cell-size / gap: px (12 / 3). week-starts-on: 0 is Sunday (default from the locale).
     legend: the "Less ... More" key (default true). format-count: a closure turning a count into text for the tooltip and cell name. label: accessible name
     of the grid. dir / locale override the app's. The grid is one tab stop with arrow-key navigation, and one shared tooltip follows hover and focus
     (needs the Alpine runtime). --}}
@include('nasaq::components.heatmap._logic')
@props(['data' => [], 'from' => null, 'to' => null, 'color' => 'var(--primary)', 'thresholds' => null, 'cellSize' => 12, 'gap' => 3, 'weekStartsOn' => null, 'legend' => true, 'formatCount' => null, 'locale' => null, 'dir' => null, 'label' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $rtl = $dir ? $dir === 'rtl' : \Nasaq\Nasaq::rtl($locale);
    $t = $ar ? ['less' => 'أقل', 'more' => 'أكثر', 'grid' => 'النشاط حسب اليوم'] : ['less' => 'Less', 'more' => 'More', 'grid' => 'Activity by day'];
    $start = $weekStartsOn ?? nq_hm_week_start($locale);
    $toDay = $to ? nq_hm_day($to) : new \DateTimeImmutable('today');
    $fromDay = $from ? nq_hm_day($from) : nq_hm_add($toDay, -52 * 7 + 1);
    $count = fn ($n) => $formatCount ? $formatCount($n) : nq_hm_count($n, $locale);

    $counts = [];
    foreach ($data as $d) {
        $key = nq_hm_day($d['date'])->format('Y-m-d');
        $counts[$key] = ($counts[$key] ?? 0) + $d['count'];
    }
    $weeks = [];
    $cursor = nq_hm_add($fromDay, -((((int) $fromDay->format('w')) - $start + 7) % 7));
    $last = nq_hm_add($toDay, -((((int) $toDay->format('w')) - $start + 7) % 7) + 6);
    while ($cursor <= $last) {
        $weeks[] = array_map(fn ($i) => nq_hm_add($cursor, $i), range(0, 6));
        $cursor = nq_hm_add($cursor, 7);
    }
    $max = 0;
    for ($d = $fromDay; $d <= $toDay; $d = nq_hm_add($d, 1)) {
        $max = max($max, $counts[$d->format('Y-m-d')] ?? 0);
    }
    $inRange = fn ($d) => $d >= $fromDay && $d <= $toDay;

    // Month labels sit on the first week that contains the 1st of a month, skipping one that would touch the previous label.
    $monthLabels = [];
    $lastIndex = -10;
    foreach ($weeks as $i => $week) {
        $first = null;
        foreach ($week as $d) {
            if ((int) $d->format('j') === 1 && $inRange($d)) {
                $first = $d;
                break;
            }
        }
        if (! $first && $i === 0) {
            foreach ($week as $d) {
                if ($inRange($d)) {
                    $first = $d;
                    break;
                }
            }
        }
        if (! $first || $i - $lastIndex < 3) {
            continue;
        }
        $monthLabels[$i] = nq_hm_format($first, $locale, 'MMM');
        $lastIndex = $i;
    }

    $levels = [
        'bg-[color-mix(in_oklab,var(--heat)_9%,transparent)]',
        'bg-[color-mix(in_oklab,var(--heat)_35%,transparent)]',
        'bg-[color-mix(in_oklab,var(--heat)_55%,transparent)]',
        'bg-[color-mix(in_oklab,var(--heat)_78%,transparent)]',
        'bg-[var(--heat)]',
    ];
    $cell = 'size-[var(--cell)] shrink-0 rounded-[3px]';
    $activeKey = $toDay->format('Y-m-d');
    $cfg = ['from' => $fromDay->format('Y-m-d'), 'to' => $activeKey, 'rtl' => $rtl];
    $style = '--heat:'.$color.';--cell:'.$cellSize.'px;--gap:'.$gap.'px';
@endphp
<div data-slot="heatmap" dir="{{ $rtl ? 'rtl' : 'ltr' }}" lang="{{ $locale }}" style="{{ $style }}" x-data="nqHeatmap(@js($cfg))"
    {{ $attributes->cn('inline-flex max-w-full flex-col gap-2 text-caption text-muted-foreground') }}>
    <div class="overflow-x-auto pb-1">
        <div class="flex gap-[var(--gap)]">
            <div aria-hidden="true" class="flex flex-col gap-[var(--gap)] pe-1">
                <span class="h-4"></span>
                @foreach ($weeks[0] ?? [] as $i => $d)
                    <span class="flex h-[var(--cell)] items-center whitespace-nowrap leading-none">{{ $i % 2 === 1 ? nq_hm_format($d, $locale, 'EEE') : '' }}</span>
                @endforeach
            </div>
            <div role="grid" aria-label="{{ $label ?? $t['grid'] }}" class="flex gap-[var(--gap)]" x-on:keydown="key($event)" x-on:focusin="focus($event)" x-on:focusout="blur()" x-on:pointerover="hover($event)" x-on:pointerout="blur()">
                @foreach ($weeks as $w => $week)
                    <div class="flex flex-col gap-[var(--gap)]">
                        <span aria-hidden="true" class="h-4 w-[var(--cell)] overflow-visible whitespace-nowrap leading-4">{{ $monthLabels[$w] ?? '' }}</span>
                        <div role="row" class="flex flex-col gap-[var(--gap)]">
                            @foreach ($week as $day)
                                @if (! $inRange($day))
                                    <span role="presentation" class="{{ $cell }}"></span>
                                @else
                                    @php
                                        $key = $day->format('Y-m-d');
                                        $n = $counts[$key] ?? 0;
                                        $level = nq_hm_level($n, $max, $thresholds);
                                        $dateText = nq_hm_format($day, $locale);
                                    @endphp
                                    <div role="gridcell" tabindex="{{ $key === $activeKey ? 0 : -1 }}" aria-label="{{ $dateText }}: {{ $count($n) }}" data-date="{{ $key }}" data-level="{{ $level }}"
                                        data-tip-count="{{ $count($n) }}" data-tip-date="{{ $dateText }}"
                                        class="{{ \Nasaq\Cn::merge($cell, $levels[$level], 'outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus', 'hover:outline hover:outline-1 hover:outline-nq-line-strong') }}"></div>
                                @endif
                            @endforeach
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
    </div>
    @if ($legend)
        <div data-slot="heatmap-legend" class="flex items-center gap-1.5 self-end">
            <span>{{ $t['less'] }}</span>
            <span aria-hidden="true" class="flex gap-[var(--gap)]">
                @foreach ($levels as $i => $cls)
                    <span data-level="{{ $i }}" class="{{ \Nasaq\Cn::merge($cell, $cls) }}"></span>
                @endforeach
            </span>
            <span>{{ $t['more'] }}</span>
        </div>
    @endif
    <div data-slot="tooltip-content" role="tooltip" x-ref="tip" x-show="tipOpen" style="display:none;position:fixed;left:0;top:0" class="z-50 max-w-64 rounded-control bg-foreground px-2 py-1 text-caption text-background">
        <strong class="font-semibold" x-text="tipCount"></strong>
        <span class="block opacity-80" x-text="tipDate"></span>
    </div>
</div>
