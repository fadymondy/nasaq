{{-- <x-nq::scheduler.slot-picker :slots="$slots" value="2026-09-29T10:00" />
     A booking picker: a Calendar (days with no free slot are disabled) beside a radio group of the chosen day's times. Arrow keys move and select inside the list; Tab leaves it.
     slots: [['start' => '2026-09-29T09:00'], ['start' => '2026-09-29T09:30', 'disabled' => true]] (times with no zone are local; DateTime works too).
     value is x-modelable (x-model / wire:model): the selected slot's start as a local ISO string, or null. Fires "slot-change" ({ start }).
     day: the day to list first (default the day of the value, else the first day with a free slot). hour12: force 12 or 24 hour time.
     locale / dir: default the app locale. today: pin "today" (for tests and docs). empty-label: text when the chosen day has no times.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['slots' => [], 'value' => null, 'day' => null, 'hour12' => null, 'locale' => null, 'dir' => null, 'today' => null, 'emptyLabel' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $locale ??= app()->getLocale();
    $loc = str_replace('_', '-', $locale);
    $rtl = $dir ? $dir === 'rtl' : in_array(strtolower(explode('-', $loc)[0]), ['ar', 'he', 'fa', 'ur'], true);
    $iso = fn ($v) => $v instanceof \DateTimeInterface ? $v->format('Y-m-d\TH:i:s') : (string) $v;
    $list = array_values(array_map(fn ($s) => ['start' => $iso($s['start']), 'disabled' => (bool) ($s['disabled'] ?? false)], (array) $slots));
    $todayKey = $today === null ? \Carbon\CarbonImmutable::now()->format('Y-m-d') : substr($iso($today), 0, 10);
    $openDays = array_values(array_unique(array_map(fn ($s) => substr($s['start'], 0, 10), array_filter($list, fn ($s) => ! $s['disabled']))));
    sort($openDays);
    $startDay = $value !== null ? substr($iso($value), 0, 10) : ($day !== null ? substr($iso($day), 0, 10) : ($openDays[0] ?? $todayKey));
    // Calendar days with no free slot, between the first and last bookable day, are disabled; the rest of the range is cut by min and max.
    $from = $openDays[0] ?? $todayKey;
    $to = $openDays ? end($openDays) : $todayKey;
    $min = $from > $todayKey ? $todayKey : $todayKey;
    $max = $to;
    $blocked = [];
    for ($d = \Carbon\CarbonImmutable::parse($todayKey); $d->format('Y-m-d') <= $max; $d = $d->addDay()) {
        if (! in_array($d->format('Y-m-d'), $openDays, true)) {
            $blocked[] = $d->format('Y-m-d');
        }
    }
    $strings = [
        'noSlots' => $emptyLabel ?? $t::t('No times available on this day.', 'لا توجد أوقات متاحة في هذا اليوم.'),
        'slotsOn' => $t::t('Available times on {date}', 'الأوقات المتاحة في {date}'),
    ];
    $config = ['slots' => $list, 'value' => $value === null ? null : $iso($value), 'day' => $startDay, 'today' => $todayKey, 'locale' => $loc, 'hour12' => $hour12 === null ? null : (bool) $hour12, 'strings' => $strings];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'slot-picker') }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}" lang="{{ $loc }}" x-data="nqSlotPicker(@js($config))" x-modelable="chosen"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 sm:flex-row') }}>
    <x-nq::calendar :value="$startDay" :min="$min" :max="$max" :disabled="$blocked" :today="$todayKey" :locale="$loc" :dir="$rtl ? 'rtl' : 'ltr'" x-model="pickDay" />
    <div data-slot="slot-picker-times" class="flex min-w-48 flex-1 flex-col gap-2">
        <h3 aria-live="polite" class="text-label font-semibold"><bdi x-text="dayLabel"></bdi></h3>
        <p x-show="noSlots" style="display: none" x-text="cfg.strings.noSlots" class="text-body-sm text-muted-foreground"></p>
        <div role="radiogroup" x-show="! noSlots" x-bind:aria-label="slotsLabel" x-on:keydown="onKey($event)" class="grid grid-cols-2 gap-2">
            <template x-for="s in daySlots" x-bind:key="s.iso">
                <button type="button" role="radio" data-slot="slot-picker-slot" x-bind:aria-checked="s.checked ? 'true' : 'false'" x-bind:data-checked="s.checked ? '' : undefined" x-bind:data-unchecked="s.checked ? undefined : ''"
                    x-bind:data-disabled="s.disabled ? '' : undefined" x-bind:disabled="s.disabled" x-bind:tabindex="s.tab ? 0 : -1" x-bind:aria-label="s.label" x-on:click="choose(s)"
                    class="inline-flex h-control cursor-pointer items-center justify-center rounded-control border border-border bg-card px-3 text-label tabular-nums transition-colors duration-150 ease-nq hover:bg-nq-hover data-checked:border-primary data-checked:bg-nq-selected data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:line-through focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                    <bdi x-text="s.label"></bdi>
                </button>
            </template>
        </div>
    </div>
</div>
