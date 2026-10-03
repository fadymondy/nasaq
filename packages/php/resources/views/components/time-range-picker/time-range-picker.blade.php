{{-- <x-nq::time-range-picker x-model="range" time-zone="Asia/Riyadh" />   <x-nq::time-range-picker :presets="['1h', '24h', '7d']" comparison="previous" />
     Picks the window a dashboard or report covers: relative presets, a week navigator, or custom days, with an optional comparison period.
     value: plain data, { kind: 'relative', preset: '24h' } | { kind: 'week', start: '2026-09-27' } | { kind: 'custom', from: '2026-09-01', to: '2026-09-15' };
     it is x-modelable (x-model / wire:model). Default: the last 24 hours. Fires "change" ({ value, from, to }); `to` is exclusive.
     presets: relative presets such as '30m', '6h', '7d' (default 1h, 6h, 24h, 7d, 30d). allow-week, allow-custom (default true), allow-future (default false).
     time-zone: the IANA zone the days are read in (default: the app timezone; pass it so server and browser agree). week-starts-on: 0 = Sunday ... 6.
     comparison: 'none' | 'previous' | 'year'. Passing it shows the "Compare with" select; the choice is `compare` in the Alpine scope and fires "comparison-change".
     show-summary (default true) shows the resolved dates. now: pin "now" (an ISO instant), for tests and docs. locale. labels: override the strings.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'presets' => ['1h', '6h', '24h', '7d', '30d'], 'allowWeek' => true, 'allowCustom' => true, 'allowFuture' => false, 'timeZone' => null, 'weekStartsOn' => null, 'comparison' => null, 'showSummary' => true, 'now' => null, 'locale' => null, 'labels' => []])
@php
    $N = \Nasaq\Nasaq::class;
    $locale ??= app()->getLocale();
    $rtl = $N::rtl();
    $zone = $timeZone ?: config('app.timezone', 'UTC');
    $L = array_merge([
        'label' => $N::t('Time range', 'النطاق الزمني'),
        'week' => $N::t('Week', 'أسبوع'),
        'customTitle' => $N::t('Custom range', 'نطاق مخصص'),
        'apply' => $N::t('Apply', 'تطبيق'),
        'cancel' => $N::t('Cancel', 'إلغاء'),
        'previousWeek' => $N::t('Previous week', 'الأسبوع السابق'),
        'nextWeek' => $N::t('Next week', 'الأسبوع التالي'),
        'thisWeek' => $N::t('This week', 'هذا الأسبوع'),
        'compare' => $N::t('Compare with', 'المقارنة مع'),
        'none' => $N::t('No comparison', 'بلا مقارنة'),
        'previous' => $N::t('Previous period', 'الفترة السابقة'),
        'year' => $N::t('Same period last year', 'الفترة نفسها من العام الماضي'),
    ], (array) $labels);
    $nowAt = $now ? \Carbon\CarbonImmutable::parse($now) : \Carbon\CarbonImmutable::now();
    $today = $nowAt->setTimezone($zone)->format('Y-m-d');
    $init = [
        'value' => $value ?? ['kind' => 'relative', 'preset' => '24h'],
        'presets' => array_values($presets),
        'allowWeek' => (bool) $allowWeek,
        'allowCustom' => (bool) $allowCustom,
        'allowFuture' => (bool) $allowFuture,
        'timeZone' => $zone,
        'weekStartsOn' => $weekStartsOn,
        'comparison' => $comparison ?? 'none',
        'now' => $nowAt->toIso8601String(),
        'locale' => $locale,
    ];
    $toggle = 'inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground '
        .'rounded-[calc(var(--radius-control)-2px)] data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'time-range-picker') }}" x-data="nqTimeRangePicker({!! \Illuminate\Support\Js::from($init) !!})" x-modelable="value"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-2') }}>
    <div class="flex min-w-0 flex-wrap items-center gap-2">
        <div role="group" data-slot="toggle-group" data-variant="segmented" data-orientation="horizontal" aria-label="{{ $L['label'] }}"
            class="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-control bg-secondary p-0.5">
            <template x-for="p in presets" :key="p">
                <button type="button" data-slot="toggle" class="{{ $toggle }}" x-bind:aria-pressed="String(pressed === p)" x-bind:data-pressed="pressed === p ? '' : undefined"
                    x-bind:aria-label="presetLong(p)" x-bind:title="presetLong(p)" x-on:click="choose(p)"><span dir="auto" x-text="presetShort(p)"></span></button>
            </template>
            @if ($allowWeek)
                <button type="button" data-slot="toggle" class="{{ $toggle }}" x-bind:aria-pressed="String(pressed === 'week')" x-bind:data-pressed="pressed === 'week' ? '' : undefined"
                    x-on:click="choose('week')">{{ $L['week'] }}</button>
            @endif
        </div>

        @if ($allowCustom)
            <x-nq::popover>
                <x-nq::popover.trigger variant="secondary" size="sm" class="tabular-nums" x-on:click="seedDraft(); toggle()" x-bind:data-active="isCustom ? '' : undefined"
                    x-bind:class="isCustom ? 'border-primary bg-nq-selected' : ''">
                    <x-lucide-calendar-days aria-hidden="true" />
                    <span x-text="customLabel">{{ $N::t('Custom', 'مخصص') }}</span>
                </x-nq::popover.trigger>
                <x-nq::popover.content align="start" dir="{{ $rtl ? 'rtl' : 'ltr' }}" lang="{{ $locale }}" aria-label="{{ $L['customTitle'] }}" class="w-auto max-w-[var(--available-width)] p-3">
                    <x-nq::calendar mode="range" x-model="draft" :number-of-months="1" :today="$today" :max="$allowFuture ? null : $today"
                        :week-starts-on="$weekStartsOn" :locale="$locale" :dir="$rtl ? 'rtl' : 'ltr'" />
                    <div class="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                        <p class="min-w-0 text-caption text-muted-foreground" aria-live="polite" x-text="draftLabel">{{ $N::t('Pick the first and last day', 'اختر أول يوم وآخر يوم') }}</p>
                        <div class="flex shrink-0 items-center gap-2">
                            <x-nq::popover.close variant="ghost" size="sm">{{ $L['cancel'] }}</x-nq::popover.close>
                            <x-nq::button variant="primary" size="sm" x-bind:disabled="!draftReady" x-on:click="if (apply()) close()">{{ $L['apply'] }}</x-nq::button>
                        </div>
                    </div>
                </x-nq::popover.content>
            </x-nq::popover>
        @endif

        @if ($comparison !== null)
            <x-nq::select x-model="compare">
                <x-nq::select.trigger aria-label="{{ $L['compare'] }}" class="h-control-sm w-auto min-w-40 max-w-full">
                    <x-nq::select.value />
                </x-nq::select.trigger>
                <x-nq::select.content>
                    <x-nq::select.item value="none">{{ $L['none'] }}</x-nq::select.item>
                    <x-nq::select.item value="previous">{{ $L['previous'] }}</x-nq::select.item>
                    <x-nq::select.item value="year">{{ $L['year'] }}</x-nq::select.item>
                </x-nq::select.content>
            </x-nq::select>
        @endif
    </div>

    <div x-show="isWeek" x-cloak data-slot="time-range-week" class="flex flex-wrap items-center gap-1.5">
        <x-nq::button variant="secondary" size="icon-sm" aria-label="{{ $L['previousWeek'] }}" x-on:click="shift(-1)">
            @if ($rtl) <x-lucide-chevron-right aria-hidden="true" /> @else <x-lucide-chevron-left aria-hidden="true" /> @endif
        </x-nq::button>
        <span class="min-w-40 text-center text-label tabular-nums" aria-live="polite" x-text="weekLabel"></span>
        <x-nq::button variant="secondary" size="icon-sm" aria-label="{{ $L['nextWeek'] }}" x-bind:disabled="!canNextWeek" x-on:click="shift(1)">
            @if ($rtl) <x-lucide-chevron-left aria-hidden="true" /> @else <x-lucide-chevron-right aria-hidden="true" /> @endif
        </x-nq::button>
        <x-nq::button variant="ghost" size="sm" x-bind:disabled="isThisWeek" x-on:click="thisWeek()">{{ $L['thisWeek'] }}</x-nq::button>
    </div>

    @if ($showSummary)
        <p data-slot="time-range-summary" class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
            <bdi class="tabular-nums text-foreground" x-text="summary"></bdi>
            <bdi dir="ltr" x-bind:title="tz" x-text="offset"></bdi>
            <span x-show="comparedText" x-cloak>{{ $N::t('Compared with', 'مقارنة مع') }} <bdi class="tabular-nums" x-text="comparedText"></bdi></span>
        </p>
    @endif
</div>
