{{-- <x-nq::calendar x-model="day" />   <x-nq::calendar mode="range" value="2026-09-08" :min="'2026-09-01'" number-of-months="2" />
     A month grid for picking a day or a range. Labels, week start and digits follow the locale (Latin digits, like the other Nasaq dates); ARIA grid keyboard pattern.
     value is x-modelable (x-model / wire:model): an ISO date "2026-09-15" (or null) in single mode, { from, to } of ISO dates in range mode.
     mode: single | range. month: any date in the month to show first. number-of-months: 1 | 2 (outside days are hidden for 2). min / max: ISO dates.
     disabled: array of ISO dates. disabled-weekdays: array, 0 = Sunday. show-outside-days (default true). fixed-weeks: always six rows.
     week-starts-on: 0 = Sunday … 6 = Saturday (default: the locale's). locale: BCP 47 (default: the app locale). dir: ltr | rtl (default: the locale's).
     calendar: an Intl calendar for the labels in the browser, e.g. "islamic-umalqura" (the first paint is Gregorian). today: pin "today" (ISO date), for tests and docs.
     previous-month-label / next-month-label. Fires "month-change" with the first of the shown month. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['mode' => 'single', 'value' => null, 'month' => null, 'numberOfMonths' => 1, 'min' => null, 'max' => null, 'disabled' => [], 'disabledWeekdays' => [], 'showOutsideDays' => true, 'fixedWeeks' => false, 'weekStartsOn' => null, 'locale' => null, 'dir' => null, 'calendar' => null, 'today' => null, 'previousMonthLabel' => null, 'nextMonthLabel' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $locale ??= app()->getLocale();
    $loc = str_replace('_', '-', $locale);
    $isRange = $mode === 'range';
    $rtl = $dir ? $dir === 'rtl' : in_array(strtolower(explode('-', $loc)[0]), ['ar', 'he', 'fa', 'ur'], true);
    $numberOfMonths = (int) $numberOfMonths === 2 ? 2 : 1;
    $day = fn ($v) => $v === null || $v === '' ? null : \Carbon\CarbonImmutable::parse($v)->startOfDay();
    $key = fn ($d) => $d?->format('Y-m-d');
    $todayDate = $day($today) ?? \Carbon\CarbonImmutable::now()->startOfDay();
    $minDate = $day($min);
    $maxDate = $day($max);
    $from = $isRange ? $day(is_array($value) ? ($value['from'] ?? null) : null) : $day($value);
    $to = $isRange ? $day(is_array($value) ? ($value['to'] ?? null) : null) : null;
    $anchor = $from ?? $todayDate;
    $clamp = fn ($d) => $minDate && $d->lt($minDate) ? $minDate : ($maxDate && $d->gt($maxDate) ? $maxDate : $d);
    $first = ($day($month) ?? $clamp($anchor))->startOfMonth();
    $lang = strtolower(explode('-', $loc)[0]);
    $region = strtoupper(explode('-', $loc)[1] ?? '');
    $firstDay = $weekStartsOn ?? (in_array($region, ['AE', 'AF', 'BH', 'DJ', 'DZ', 'EG', 'IQ', 'IR', 'JO', 'KW', 'LY', 'OM', 'QA', 'SD', 'SY'], true) ? 6
        : (in_array($region, ['SA', 'US', 'CA', 'IL', 'JP', 'IN', 'BR', 'MX', 'PH', 'KR', 'TW', 'YE'], true) ? 0
        : ($region === '' ? ($lang === 'ar' ? 6 : 0) : 1)));
    $firstDay = (int) $firstDay;
    $intl = class_exists(\IntlDateFormatter::class);
    $fmt = function ($d, string $pattern) use ($intl, $loc) {
        if (! $intl) {
            return $d->format(['LLLL y' => 'F Y', 'EEEEE' => 'D', 'EEEE' => 'l', 'd' => 'j', 'full' => 'l, F j, Y'][$pattern]);
        }
        $f = $pattern === 'full'
            ? new \IntlDateFormatter($loc.'@numbers=latn', \IntlDateFormatter::FULL, \IntlDateFormatter::NONE, 'UTC')
            : new \IntlDateFormatter($loc.'@numbers=latn', \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, 'UTC', null, $pattern);

        return $f->format(new \DateTime($d->format('Y-m-d').' 12:00:00', new \DateTimeZone('UTC')));
    };
    $narrow = fn ($d) => $intl ? $fmt($d, 'EEEEE') : mb_substr($fmt($d, 'EEEE'), 0, 1);
    $weekdayDate = fn ($wd) => \Carbon\CarbonImmutable::create(2023, 1, 1 + $wd)->startOfDay();
    $prevLabel = $previousMonthLabel ?? $t::t('Previous month', 'الشهر السابق');
    $nextLabel = $nextMonthLabel ?? $t::t('Next month', 'الشهر التالي');
    $init = [
        'mode' => $isRange ? 'range' : 'single',
        'value' => $isRange ? ['from' => $key($from), 'to' => $key($to)] : $key($from),
        'month' => $key($first), 'numberOfMonths' => $numberOfMonths, 'min' => $key($minDate), 'max' => $key($maxDate),
        'disabled' => array_values(array_map(fn ($d) => $key($day($d)), (array) $disabled)), 'disabledWeekdays' => array_values((array) $disabledWeekdays),
        'showOutsideDays' => (bool) $showOutsideDays, 'fixedWeeks' => (bool) $fixedWeeks, 'weekStartsOn' => $weekStartsOn !== null ? $firstDay : null,
        'locale' => $loc, 'dir' => $dir, 'calendar' => $calendar, 'today' => $today ? $key($todayDate) : null,
        'previousMonthLabel' => $previousMonthLabel, 'nextMonthLabel' => $nextMonthLabel,
    ];
    $tabKey = $key($clamp($anchor));
    $isDisabled = fn ($d) => ($minDate && $d->lt($minDate)) || ($maxDate && $d->gt($maxDate)) || in_array($d->dayOfWeek, array_map('intval', (array) $disabledWeekdays), true) || in_array($key($d), $init['disabled'], true);
    $showOutside = $showOutsideDays && $numberOfMonths === 1;
    $dayClass = 'inline-flex size-9 min-h-[var(--nq-touch-min,0px)] min-w-[var(--nq-touch-min,0px)] items-center justify-center rounded-control border border-transparent text-body-sm tabular-nums outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus data-today:border-nq-focus data-outside:text-muted-foreground data-disabled:cursor-not-allowed data-disabled:text-muted-foreground data-disabled:opacity-40 data-disabled:hover:bg-transparent data-selected:border-transparent data-selected:bg-primary data-selected:text-primary-foreground data-selected:hover:bg-primary';
    $headClass = 'size-9 p-0 text-caption font-medium text-muted-foreground';
    $rows = function ($m) use ($firstDay, $fixedWeeks) {
        $start = $m->startOfMonth();
        $lead = ($start->dayOfWeek - $firstDay + 7) % 7;
        $total = $fixedWeeks ? 6 : (int) ceil(($lead + $m->daysInMonth) / 7);
        $cursor = $start->subDays($lead);
        $weeks = [];
        for ($r = 0; $r < $total; $r++) {
            $week = [];
            for ($c = 0; $c < 7; $c++) { $week[] = $cursor; $cursor = $cursor->addDay(); }
            $weeks[] = $week;
        }
        return $weeks;
    };
@endphp
<div data-slot="calendar" data-mode="{{ $isRange ? 'range' : 'single' }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}" lang="{{ $loc }}" x-data="nqCalendar(@js($init))" x-modelable="value" x-bind="root"
    {{ $attributes->cn('inline-flex w-fit flex-col gap-2 text-body-sm text-foreground') }}>
    <div class="flex flex-wrap gap-x-6 gap-y-4">
        {{-- Server first paint: removed when Alpine takes over. --}}
        @foreach (range(0, $numberOfMonths - 1) as $index)
            @php $m = $first->addMonthsNoOverflow($index); $title = $fmt($m->setDay(15), 'LLLL y'); @endphp
            <div data-ssr data-slot="calendar-month" class="flex flex-col gap-2">
                <div class="flex items-center justify-between gap-2">
                    @if ($index === 0)
                        <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $prevLabel }}" :disabled="$minDate && $first->subMonthNoOverflow()->lt($minDate->startOfMonth())">
                            @if ($rtl)<x-lucide-chevron-right aria-hidden="true" />@else<x-lucide-chevron-left aria-hidden="true" />@endif
                        </x-nq::button>
                    @else<span class="size-control-sm"></span>@endif
                    <div aria-live="polite" data-slot="calendar-title" class="text-label font-semibold">{{ $title }}</div>
                    @if ($index === $numberOfMonths - 1)
                        <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $nextLabel }}" :disabled="$maxDate && $first->addMonthsNoOverflow($numberOfMonths)->gt($maxDate)">
                            @if ($rtl)<x-lucide-chevron-left aria-hidden="true" />@else<x-lucide-chevron-right aria-hidden="true" />@endif
                        </x-nq::button>
                    @else<span class="size-control-sm"></span>@endif
                </div>
                <table role="grid" aria-label="{{ $title }}" data-slot="calendar-grid" class="border-separate border-spacing-0">
                    <thead>
                        <tr>
                            @foreach (range(0, 6) as $i)
                                @php $wd = ($firstDay + $i) % 7; @endphp
                                <th scope="col" class="{{ $headClass }}"><span aria-hidden="true">{{ $narrow($weekdayDate($wd)) }}</span><span class="sr-only">{{ $fmt($weekdayDate($wd), 'EEEE') }}</span></th>
                            @endforeach
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($rows($m) as $week)
                            <tr>
                                @foreach ($week as $d)
                                    @php
                                        $outside = $d->month !== $m->month || $d->year !== $m->year;
                                        $selected = $isRange ? (($from && $d->isSameDay($from)) || ($to && $d->isSameDay($to))) : ($from && $d->isSameDay($from));
                                        $band = $isRange && $from && $to && $d->between($from, $to) && ! $from->isSameDay($to);
                                        $isToday = $d->isSameDay($todayDate);
                                    @endphp
                                    @if ($outside && ! $showOutside)
                                        <td role="gridcell"></td>
                                    @else
                                        <td role="gridcell" @if ($selected) aria-selected="true" @endif @if ($band) data-in-range @endif class="p-0 text-center {{ $band ? 'bg-nq-selected' : '' }} {{ $band && $from && $d->isSameDay($from) ? 'rounded-s-control' : '' }} {{ $band && $to && $d->isSameDay($to) ? 'rounded-e-control' : '' }}">
                                            <button type="button" tabindex="{{ $key($d) === $tabKey ? 0 : -1 }}" data-date="{{ $key($d) }}" @if ($selected) data-selected @endif @if ($isToday) data-today aria-current="date" @endif
                                                @if ($outside) data-outside @endif @if ($isDisabled($d)) data-disabled aria-disabled="true" @endif aria-label="{{ $fmt($d, 'full') }}" class="{{ $dayClass }}">{{ $fmt($d, 'd') }}</button>
                                        </td>
                                    @endif
                                @endforeach
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endforeach
        <template x-for="m in monthViews" :key="m.key">
            <div data-slot="calendar-month" class="flex flex-col gap-2">
                <div class="flex items-center justify-between gap-2">
                    <x-nq::button variant="ghost" size="icon-sm" x-show="m.first" x-bind:aria-label="prevLabel" x-bind:disabled="prevBlocked" x-on:click="step(-1)">
                        <x-lucide-chevron-right x-show="rtl" aria-hidden="true" />
                        <x-lucide-chevron-left x-show="!rtl" aria-hidden="true" />
                    </x-nq::button>
                    <span x-show="!m.first" class="size-control-sm"></span>
                    <div aria-live="polite" data-slot="calendar-title" class="text-label font-semibold" x-text="m.title"></div>
                    <x-nq::button variant="ghost" size="icon-sm" x-show="m.last" x-bind:aria-label="nextLabel" x-bind:disabled="nextBlocked" x-on:click="step(1)">
                        <x-lucide-chevron-left x-show="rtl" aria-hidden="true" />
                        <x-lucide-chevron-right x-show="!rtl" aria-hidden="true" />
                    </x-nq::button>
                    <span x-show="!m.last" class="size-control-sm"></span>
                </div>
                <table role="grid" :aria-label="m.title" data-slot="calendar-grid" class="border-separate border-spacing-0">
                    <thead>
                        <tr>
                            {{-- Fixed rows and cells (not nested x-for templates): table markup inside <template> is mangled by some parsers. --}}
                            @foreach (range(0, 6) as $i)
                                <th scope="col" class="{{ $headClass }}"><span aria-hidden="true" x-text="m.heads[{{ $i }}].narrow"></span><span class="sr-only" x-text="m.heads[{{ $i }}].long"></span></th>
                            @endforeach
                        </tr>
                    </thead>
                    <tbody>
                        @foreach (range(0, 5) as $r)
                            <tr x-show="m.weeks.length > {{ $r }}">
                                @foreach (range(0, 6) as $c)
                                    <td role="gridcell" :aria-selected="cell(m, {{ $r }}, {{ $c }}).selected ? 'true' : null" :data-in-range="cell(m, {{ $r }}, {{ $c }}).band ? '' : null" :class="cell(m, {{ $r }}, {{ $c }}).tdClass">
                                        <button type="button" x-show="!cell(m, {{ $r }}, {{ $c }}).blank" :tabindex="cell(m, {{ $r }}, {{ $c }}).tab ? 0 : -1" :data-date="cell(m, {{ $r }}, {{ $c }}).key"
                                            :data-selected="cell(m, {{ $r }}, {{ $c }}).selected ? '' : null" :data-today="cell(m, {{ $r }}, {{ $c }}).today ? '' : null"
                                            :data-outside="cell(m, {{ $r }}, {{ $c }}).outside ? '' : null" :data-disabled="cell(m, {{ $r }}, {{ $c }}).disabled ? '' : null"
                                            :aria-disabled="cell(m, {{ $r }}, {{ $c }}).disabled ? 'true' : null" :aria-current="cell(m, {{ $r }}, {{ $c }}).today ? 'date' : null"
                                            :aria-label="cell(m, {{ $r }}, {{ $c }}).label" x-text="cell(m, {{ $r }}, {{ $c }}).day" x-on:click="pick(cell(m, {{ $r }}, {{ $c }}).key)"
                                            x-on:focus="!cell(m, {{ $r }}, {{ $c }}).disabled && hoverIfOpen(cell(m, {{ $r }}, {{ $c }}).key)" x-on:mouseenter="hoverIfOpen(cell(m, {{ $r }}, {{ $c }}).key)" class="{{ $dayClass }}"></button>
                                    </td>
                                @endforeach
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </template>
    </div>
</div>
