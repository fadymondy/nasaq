{{-- <x-nq::gamification.streak-calendar :active-days="['2026-09-19', '2026-09-20']" />   :today="'2026-09-20'" :week-start="1"
     A month of days with the active ones filled. Active is a check as well as a fill, so it does not depend on colour. active-days: YYYY-MM-DD strings, dates or timestamps.
     month: any date inside the month shown (default: this month). today: override "today". week-start: first column, 0 Sunday, 1 Monday, 6 Saturday (default 6 in Arabic, 0 otherwise).
     The arrows page through the months in the browser (Alpine runtime) and dispatch nq-month-change { month: 'YYYY-MM' }. --}}
@props(['activeDays' => [], 'month' => null, 'today' => null, 'weekStart' => null, 'labels' => [], 'locale' => null])
@include('nasaq::components.gamification._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_gm_words($locale, $labels);
    $ar = str_starts_with($locale, 'ar');
    $start = $weekStart ?? ($ar ? 6 : 0);
    $todayKey = nq_gm_day_key($today ?? now());
    $monthKey = nq_gm_day_key($month ?? $todayKey);
    [$year, $mon] = array_map('intval', explode('-', $monthKey));
    $days = nq_gm_day_keys($activeDays);
    $weeks = nq_gm_month_grid($year, $mon, $days, $todayKey, $start);
    // 2026-08-30 is a Sunday.
    $weekdays = [];
    for ($i = 0; $i < 7; $i++) {
        $weekdays[] = nq_gm_date(\Carbon\Carbon::create(2026, 8, 30 + (($i + $start) % 7)), $locale, 'EEE');
    }
    $config = ['days' => $days, 'today' => $todayKey, 'year' => $year, 'month' => $mon, 'start' => $start, 'locale' => str_replace('_', '-', $locale), 'today_label' => $t['today'], 'active_label' => $t['activeDay']];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'streak-calendar') }}" x-data="nqStreakCalendar(@js($config))" {{ $attributes->except('data-slot')->cn('flex w-full max-w-sm flex-col gap-2') }}>
    <div class="flex items-center justify-between">
        <x-nq::button variant="ghost" size="icon-sm" :aria-label="$t['prevMonth']" x-on:click="go(-1)"><x-lucide-chevron-left aria-hidden="true" class="rtl:-scale-x-100" /></x-nq::button>
        <span aria-live="polite" class="text-label text-foreground" x-ref="title">{{ nq_gm_date(\Carbon\Carbon::create($year, $mon, 1), $locale, 'LLLL y') }}</span>
        <x-nq::button variant="ghost" size="icon-sm" :aria-label="$t['nextMonth']" x-on:click="go(1)"><x-lucide-chevron-right aria-hidden="true" class="rtl:-scale-x-100" /></x-nq::button>
    </div>
    <table role="grid" class="w-full table-fixed border-separate border-spacing-1 text-center">
        <thead>
            <tr>@foreach ($weekdays as $d)<th scope="col" class="pb-1 text-caption font-normal text-muted-foreground">{{ $d }}</th>@endforeach</tr>
        </thead>
        <tbody x-ref="body">
            @foreach ($weeks as $week)
                <tr>
                    @foreach ($week as $c)
                        <td class="p-0">
                            @if ($c)
                                <span @if ($c['active']) data-active @endif @if ($c['today']) data-today @endif
                                    @if ($c['today']) title="{{ $t['today'] }}" @elseif ($c['active']) title="{{ $t['activeDay'] }}" @endif
                                    class="{{ \Nasaq\Cn::merge(
                                        'relative mx-auto grid aspect-square w-full max-w-9 place-items-center rounded-full text-caption tabular-nums',
                                        $c['active'] ? 'bg-nq-warning text-nq-bg' : ($c['future'] ? 'text-muted-foreground/60' : 'text-foreground'),
                                        $c['today'] ? 'outline-2 -outline-offset-2 outline-nq-focus' : '',
                                    ) }}">{{ nq_gm_num($c['day'], $locale) }}@if ($c['active'])<span class="sr-only">{{ $t['activeDay'] }}</span><x-lucide-check aria-hidden="true" class="absolute -end-0.5 -top-0.5 size-3 rounded-full bg-card p-px text-nq-success-text" />@endif</span>
                            @endif
                        </td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
