{{-- <x-nq::booking-slots :slots="[['start' => '2030-01-11T09:00', 'state' => 'available'], ['start' => '2030-01-11T10:00', 'state' => 'full']]" x-model="start" />
     The date and time step of a booking: a calendar (days with nothing free are disabled) beside the day's times.
     slots: array of { start: "YYYY-MM-DDTHH:mm" (local), state: available | full | held | past }. Past times are not listed.
     value: the chosen start (x-modelable, x-model / wire:model). now: pins "now" (for tests and docs). default-day: "YYYY-MM-DD".
     grouped (default true): morning / afternoon / evening when the day has more than 8. hour12: force the clock. week-starts-on, locale, dir as on the calendar.
     loading: show skeleton times. Bubbling events: "change" { start, day } and "day-change" { day }. Arrow keys move and select inside the list.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['slots' => [], 'value' => null, 'now' => null, 'defaultDay' => null, 'grouped' => true, 'hour12' => null, 'weekStartsOn' => null, 'locale' => null, 'dir' => null, 'loading' => false])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $locale ??= app()->getLocale();
    $rtl = $dir ? $dir === 'rtl' : in_array(strtolower(explode('-', str_replace('_', '-', $locale))[0]), ['ar', 'he', 'fa', 'ur'], true);
    $list = array_values((array) $slots);
    $nowDate = $now ? \Carbon\CarbonImmutable::parse($now) : \Carbon\CarbonImmutable::now();
    $today = $nowDate->startOfDay();
    $open = [];
    foreach ($list as $s) {
        if (($s['state'] ?? '') === 'available') {
            $open[\Carbon\CarbonImmutable::parse($s['start'])->format('Y-m-d')] = true;
        }
    }
    $disabled = [];
    for ($i = 0; $i < 180; $i++) {
        $d = $today->addDays($i)->format('Y-m-d');
        if (! isset($open[$d])) {
            $disabled[] = $d;
        }
    }
    $options = array_filter([
        'now' => $nowDate->format('Y-m-d\TH:i'),
        'grouped' => $grouped ? null : false,
        'hour12' => $hour12,
        'defaultDay' => $defaultDay,
    ], fn ($v) => $v !== null);
    $tile = 'inline-flex min-h-control flex-col items-center justify-center gap-0.5 rounded-control border border-border bg-card px-2 py-1.5 text-label tabular-nums outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:hover:bg-card';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'booking-slots') }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}" lang="{{ str_replace('_', '-', $locale) }}"
    x-data="nqBookingSlots({!! \Illuminate\Support\Js::from($list)->toHtml() !!}, {!! \Illuminate\Support\Js::from((object) $options)->toHtml() !!})" x-modelable="value"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 sm:flex-row') }}>
    <x-nq::calendar x-model="day" class="self-start" :min="$today->format('Y-m-d')" :today="$today->format('Y-m-d')" :disabled="$disabled" :week-starts-on="$weekStartsOn" :locale="$locale" :dir="$rtl ? 'rtl' : 'ltr'" />
    <div data-slot="booking-slots-times" class="flex min-w-0 flex-1 flex-col gap-3" @if ($loading) aria-busy="true" @endif>
        <div class="flex flex-col gap-0.5">
            <h3 aria-live="polite" class="text-label font-semibold"><bdi x-text="dayLabel()"></bdi></h3>
            @unless ($loading)
                <p x-show="inDay().length > 0" x-cloak style="display: none" class="text-caption text-muted-foreground" x-text="openText()"></p>
            @endunless
        </div>

        @if ($loading)
            <div class="grid grid-cols-3 gap-2" role="status" aria-label="…">
                @for ($i = 0; $i < 9; $i++)
                    <x-nq::states.skeleton class="h-control" />
                @endfor
            </div>
        @else
            <p x-show="inDay().length === 0" x-cloak style="display: none" class="text-body-sm text-muted-foreground">{{ $T('No times on this day.', 'لا مواعيد في هذا اليوم.') }}</p>
            <div x-show="inDay().length > 0" role="radiogroup" data-slot="radio-group" x-bind:aria-label="$nq.t('Times on ', 'المواعيد يوم ') + dayLabel()" class="grid gap-4">
                <template x-for="g in groups()" :key="g.key">
                    <div class="flex flex-col gap-2">
                        <p x-show="g.label" class="text-caption font-medium text-muted-foreground" x-text="g.label"></p>
                        <div class="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
                            <template x-for="s in g.items" :key="s.startKey">
                                <button type="button" role="radio" data-slot="booking-slot" x-bind:data-start="s.startKey" x-bind:data-state="isChosen(s) ? 'checked' : s.state"
                                    x-bind:data-status="s.state" x-bind:aria-checked="String(isChosen(s))" x-bind:aria-label="slotLabel(s)" x-bind:title="s.state === 'held' ? $nq.t('Someone is booking this time right now. It may free up in a few minutes.', 'شخص آخر يحجز هذا الموعد الآن. قد يتوفر بعد دقائق.') : null"
                                    x-bind:disabled="s.state !== 'available'" x-bind:tabindex="tabIndex(s)" x-on:click="pick(s)" x-on:keydown="key($event, s)"
                                    x-bind:class="{ 'border-primary bg-nq-selected': isChosen(s), 'bg-secondary text-muted-foreground': s.state === 'full', 'border-dashed text-muted-foreground': s.state === 'held' }"
                                    class="{{ $tile }}">
                                    <bdi x-bind:class="s.state === 'full' && 'line-through'" x-text="fmtTime(s.start)"></bdi>
                                    <span x-show="s.state !== 'available'" x-cloak style="display: none" class="inline-flex items-center gap-1 text-caption font-normal">
                                        <x-lucide-ban aria-hidden="true" class="size-3" x-show="s.state === 'full'" style="display: none" />
                                        <x-lucide-lock aria-hidden="true" class="size-3" x-show="s.state === 'held'" style="display: none" />
                                        <span x-text="stateLabel(s)"></span>
                                    </span>
                                </button>
                            </template>
                        </div>
                    </div>
                </template>
            </div>

            <div x-show="inDay().length > 0 && counts().available === 0" x-cloak style="display: none">
                <x-nq::button variant="secondary" size="sm" class="self-start" x-show="nextFree()" x-on:click="goNext()"><x-lucide-calendar-search aria-hidden="true" />{{ $T('Go to the next day with a free time', 'الانتقال إلى أقرب يوم به موعد متاح') }}</x-nq::button>
                <p x-show="!nextFree()" class="text-body-sm text-muted-foreground">{{ $T('Nothing is free in the coming weeks.', 'لا يوجد موعد متاح في الأسابيع القادمة.') }}</p>
            </div>
        @endif

        <ul aria-label="{{ $T('Legend', 'دليل الألوان') }}" class="m-0 mt-auto flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-caption text-muted-foreground">
            <li class="inline-flex items-center gap-1.5"><span aria-hidden="true" class="size-3 rounded-[3px] border border-border bg-card"></span>{{ $T('Available', 'متاح') }}</li>
            <li class="inline-flex items-center gap-1.5"><span aria-hidden="true" class="size-3 rounded-[3px] border border-border bg-secondary"></span>{{ $T('Full', 'محجوز') }}</li>
            <li class="inline-flex items-center gap-1.5"><span aria-hidden="true" class="size-3 rounded-[3px] border border-dashed border-border bg-card"></span>{{ $T('Held', 'محجوز مؤقتًا') }}</li>
        </ul>
    </div>
</div>
