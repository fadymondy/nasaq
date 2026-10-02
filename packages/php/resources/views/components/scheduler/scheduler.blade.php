{{-- <x-nq::scheduler :events="$events" :working-hours="['start' => 8, 'end' => 18]" date="2026-09-29" />
     A day, week or month schedule. Events are blocks placed by time (overlaps share the column) or month chips with a "+N more" list.
     Read only: clicking an empty slot or an event reports it; nothing is dragged or resized.
     events: [['id' => '1', 'title' => 'Design review', 'start' => '2026-09-29T10:00', 'end' => '2026-09-29T11:30', 'tone' => 'brand']] (times with no zone are local; DateTime works too).
     tone: neutral | brand | success | warning | danger | info. view: day | week (default) | month. date: any day inside the visible range (default today).
     working-hours: visible hours of the day (default 8 to 18). slot-minutes: one clickable slot (default 30). week-starts-on: 0 = Sunday … 6 (default the locale's).
     hour12: force 12 or 24 hour time. max-chips: chips per month day before "+N more" (default 3). locale / dir: default the app locale. today: pin "today" (for tests and docs).
     Fires "slot-select" ({ start, end }), "event-click" ({ id, title }), "view-change" ({ view }) and "date-change" ({ date }) on the root; dates are local ISO strings.
     The grid is drawn by the browser from the events (the layout math ships with the Alpine runtime); the server paints the toolbar.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['events' => [], 'view' => 'week', 'date' => null, 'workingHours' => ['start' => 8, 'end' => 18], 'slotMinutes' => 30, 'weekStartsOn' => null, 'hour12' => null, 'maxChips' => 3, 'locale' => null, 'dir' => null, 'today' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $js = fn ($v) => \Illuminate\Support\Js::from($v);
    $locale ??= app()->getLocale();
    $loc = str_replace('_', '-', $locale);
    $rtl = $dir ? $dir === 'rtl' : in_array(strtolower(explode('-', $loc)[0]), ['ar', 'he', 'fa', 'ur'], true);
    $view = in_array($view, ['day', 'week', 'month'], true) ? $view : 'week';
    $iso = fn ($v) => $v instanceof \DateTimeInterface ? $v->format('Y-m-d\TH:i:s') : (string) $v;
    $hours = ['start' => (int) ($workingHours['start'] ?? $workingHours[0] ?? 8), 'end' => (int) ($workingHours['end'] ?? $workingHours[1] ?? 18)];
    $tones = [
        'neutral' => 'border-border bg-secondary text-foreground',
        'brand' => 'border-nq-brand/40 bg-[color-mix(in_oklab,var(--nq-brand)_14%,transparent)] text-foreground',
        'success' => 'border-nq-success/40 bg-nq-success-soft text-nq-success-text',
        'warning' => 'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text',
        'danger' => 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text',
        'info' => 'border-nq-info/40 bg-nq-info-soft text-nq-info-text',
    ];
    $config = [
        'events' => array_values(array_map(fn ($e) => ['id' => (string) $e['id'], 'title' => (string) $e['title'], 'start' => $iso($e['start']), 'end' => $iso($e['end']), 'tone' => $e['tone'] ?? 'neutral'], (array) $events)),
        'view' => $view,
        'date' => $date === null ? null : $iso($date),
        'today' => $today === null ? null : $iso($today),
        'workingHours' => $hours,
        'slotMinutes' => (int) $slotMinutes,
        'weekStartsOn' => $weekStartsOn === null ? null : (int) $weekStartsOn,
        'hour12' => $hour12 === null ? null : (bool) $hour12,
        'maxChips' => (int) $maxChips,
        'locale' => $loc,
        'dir' => $rtl ? 'rtl' : 'ltr',
        'tones' => $tones,
        'strings' => [
            'today' => $t::t('Today', 'اليوم'),
            'previous' => ['day' => $t::t('Previous day', 'اليوم السابق'), 'week' => $t::t('Previous week', 'الأسبوع السابق'), 'month' => $t::t('Previous month', 'الشهر السابق')],
            'next' => ['day' => $t::t('Next day', 'اليوم التالي'), 'week' => $t::t('Next week', 'الأسبوع التالي'), 'month' => $t::t('Next month', 'الشهر التالي')],
            'more' => $t::t('+{n} more', '+{n} أخرى'),
            'eventsOn' => $t::t('Events on {date}', 'الأحداث في {date}'),
            'slotsOn' => $t::t('Available times on {date}', 'الأوقات المتاحة في {date}'),
            'noSlots' => $t::t('No times available on this day.', 'لا توجد أوقات متاحة في هذا اليوم.'),
        ],
    ];
    $focus = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus';
    $chip = 'flex w-full min-w-0 items-center gap-1 rounded-[4px] border px-1.5 py-0.5 text-start text-caption';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'scheduler') }}" data-view="{{ $view }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}" lang="{{ $loc }}" x-data="nqScheduler(@js($config))" x-bind:data-view="view"
    {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-3 text-body-sm text-foreground') }}>
    <div data-slot="scheduler-toolbar" class="flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-1">
            <x-nq::button variant="ghost" size="icon-sm" x-bind:aria-label="previousLabel" aria-label="{{ $config['strings']['previous'][$view] }}" x-on:click="step(-1)"><x-nq::icon name="chevron-left" /></x-nq::button>
            <x-nq::button variant="ghost" size="icon-sm" x-bind:aria-label="nextLabel" aria-label="{{ $config['strings']['next'][$view] }}" x-on:click="step(1)"><x-nq::icon name="chevron-right" /></x-nq::button>
            <x-nq::button size="sm" x-on:click="goToday()">{{ $config['strings']['today'] }}</x-nq::button>
        </div>
        <h2 aria-live="polite" class="me-auto text-body font-semibold"><bdi x-text="title"></bdi></h2>
        <x-nq::toggle-group aria-label="{{ $t::t('View', 'العرض') }}" :default-value="[$view]" x-model="viewValue">
            <x-nq::toggle-group.toggle value="day">{{ $t::t('Day', 'يوم') }}</x-nq::toggle-group.toggle>
            <x-nq::toggle-group.toggle value="week">{{ $t::t('Week', 'أسبوع') }}</x-nq::toggle-group.toggle>
            <x-nq::toggle-group.toggle value="month">{{ $t::t('Month', 'شهر') }}</x-nq::toggle-group.toggle>
        </x-nq::toggle-group>
    </div>

    <div x-show="view !== 'month'" @if ($view === 'month') style="display: none" @endif data-slot="scheduler-grid" class="overflow-auto rounded-card border border-border bg-card">
        <div class="sticky top-0 z-20 grid border-b border-border bg-card" x-bind:style="columnsStyle">
            <div></div>
            <template x-for="d in days" x-bind:key="d.key">
                <div x-bind:data-today="d.today ? '' : undefined" class="flex flex-col items-center gap-0.5 border-s border-border py-1.5">
                    <span class="text-caption text-muted-foreground" x-text="d.weekday"></span>
                    <span x-text="d.num" x-bind:class="d.today ? 'bg-primary text-primary-foreground' : ''" class="flex size-6 items-center justify-center rounded-full text-label tabular-nums"></span>
                </div>
            </template>
        </div>
        <div class="grid" x-bind:style="columnsStyle" x-on:keydown="onGridKey($event)">
            <div aria-hidden="true">
                <template x-for="h in hourRows" x-bind:key="h.m">
                    <div class="h-8 pe-2 text-end text-caption text-muted-foreground tabular-nums">
                        <span x-show="h.show" x-text="h.label" x-bind:class="h.first ? '' : '-top-2'" class="relative bg-card"></span>
                    </div>
                </template>
            </div>
            <template x-for="d in days" x-bind:key="d.key">
                <div x-bind:data-date="d.key" class="relative border-s border-border">
                    <template x-for="s in d.slots" x-bind:key="s.key">
                        <button type="button" data-slot="scheduler-slot" x-bind:data-col="d.col" x-bind:data-row="s.row" x-bind:tabindex="isFocusCell(d.col, s.row) ? 0 : -1" x-bind:aria-label="s.label"
                            x-bind:class="s.dashed ? 'border-dashed' : ''" x-on:focus="onSlotFocus(d.col, s.row)" x-on:click="pickSlot(s)"
                            class="block h-8 w-full border-b border-border transition-colors duration-150 ease-nq hover:bg-nq-hover {{ $focus }}"></button>
                    </template>
                    <template x-for="ev in d.events" x-bind:key="ev.id">
                        <button type="button" data-slot="scheduler-event" x-bind:data-tone="ev.tone" x-bind:aria-label="ev.label" x-bind:class="ev.toneClass" x-bind:style="ev.style" x-on:click="pickEvent(ev)"
                            class="absolute z-10 flex min-h-0 flex-col items-start overflow-hidden rounded-[4px] border px-1.5 py-0.5 text-start text-caption {{ $focus }}">
                            <span class="w-full truncate font-medium" x-text="ev.title"></span>
                            <span x-show="ev.tall" class="w-full truncate tabular-nums opacity-80"><bdi x-text="ev.range"></bdi></span>
                        </button>
                    </template>
                </div>
            </template>
        </div>
    </div>

    <div x-show="view === 'month'" @if ($view !== 'month') style="display: none" @endif data-slot="scheduler-grid" class="overflow-hidden rounded-card border border-border bg-card">
        <div class="grid grid-cols-7 border-b border-border">
            <template x-for="(w, i) in weekdayNames" x-bind:key="i">
                <div class="px-2 py-1.5 text-caption text-muted-foreground" x-text="w"></div>
            </template>
        </div>
        <template x-for="(row, r) in monthRows" x-bind:key="r">
            <div class="grid grid-cols-7">
                <template x-for="day in row" x-bind:key="day.key">
                    <div data-slot="scheduler-day" x-bind:data-date="day.key" x-bind:data-outside="day.outside ? '' : undefined" x-bind:data-today="day.today ? '' : undefined"
                        x-bind:class="day.outside ? 'bg-secondary/40' : ''" class="relative flex min-h-24 min-w-0 flex-col gap-0.5 border-b border-s border-border p-1">
                        <button type="button" x-bind:aria-label="day.label" x-text="day.num" x-on:click="fire('slot-select', { start: day.start, end: day.end })"
                            x-bind:class="(day.outside ? 'text-muted-foreground ' : '') + (day.today ? 'bg-primary text-primary-foreground hover:bg-primary' : '')"
                            class="flex size-6 items-center justify-center self-start rounded-full text-label tabular-nums hover:bg-nq-hover {{ $focus }}"></button>
                        <template x-for="e in day.chips" x-bind:key="e.id">
                            <button type="button" data-slot="scheduler-chip" x-bind:data-tone="e.tone" x-bind:aria-label="e.label" x-bind:class="e.toneClass" x-on:click="pickEvent(e)"
                                class="{{ $chip }} {{ $focus }}">
                                <span class="shrink-0 tabular-nums opacity-80"><bdi x-text="e.time"></bdi></span>
                                <span class="truncate font-medium" x-text="e.title"></span>
                            </button>
                        </template>
                        <template x-if="day.hidden > 0">
                            <div class="contents">
                                <button type="button" x-bind:aria-expanded="moreKey === day.key ? 'true' : 'false'" x-on:click="toggleMore(day.key)"
                                    class="rounded-[4px] px-1.5 py-0.5 text-start text-caption font-medium text-muted-foreground hover:bg-nq-hover hover:text-foreground {{ $focus }}"><bdi x-text="day.more"></bdi></button>
                                <div x-show="moreKey === day.key" style="display: none" role="group" x-bind:aria-label="day.eventsOn" x-on:click.outside="moreKey === day.key && (moreKey = null)" x-on:keydown.escape="moreKey = null"
                                    class="absolute start-0 top-full z-30 flex w-64 flex-col gap-1 rounded-floating border border-border bg-popover p-3 text-popover-foreground shadow-floating">
                                    <p class="text-label font-semibold" x-text="day.eventsOn"></p>
                                    <template x-for="e in day.all" x-bind:key="e.id">
                                        <button type="button" data-slot="scheduler-chip" x-bind:data-tone="e.tone" x-bind:aria-label="e.label" x-bind:class="e.toneClass" x-on:click="pickEvent(e)"
                                            class="{{ $chip }} {{ $focus }}">
                                            <span class="shrink-0 tabular-nums opacity-80"><bdi x-text="e.time"></bdi></span>
                                            <span class="truncate font-medium" x-text="e.title"></span>
                                        </button>
                                    </template>
                                </div>
                            </div>
                        </template>
                    </div>
                </template>
            </div>
        </template>
    </div>
</div>
