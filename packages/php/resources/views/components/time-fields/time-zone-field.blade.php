{{-- <x-nq::time-fields.time-zone-field x-model="zone" />   <x-nq::time-fields.time-zone-field value="Asia/Riyadh" reference="Africa/Cairo" :zones="['Asia/Riyadh', 'Europe/London']" name="timezone" />
     A time zone picker with a live clock. Type a city ("riyadh"), a region ("asia"), the zone's own name or an offset ("utc+3", "+05:30") and the list narrows; every row shows the time
     there right now and its offset, or how far it is from `reference`. Below the field the chosen zone keeps ticking, and a button picks the reader's own zone. Daylight saving comes from
     Intl in the browser, so no table goes stale. value (an IANA name) is x-modelable (x-model / wire:model). Fires a bubbling "change" ({ value }).
     zones: narrow the list (default every zone the browser knows). reference: show each zone's gap from this one. show-clock / show-detect (default true). seconds, hour-cycle: 12 | 24.
     limit: most zones listed at once (default 60; the list says when it is cut). now: freeze the clocks (DateTime, timestamp or string; for docs and tests). name: a hidden input carries the zone.
     input-id, placeholder, aria-label (lands on the search input), disabled, labels, locale.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'zones' => null, 'reference' => null, 'showClock' => true, 'showDetect' => true, 'seconds' => false, 'hourCycle' => null, 'limit' => 60, 'now' => null, 'placeholder' => null, 'disabled' => false, 'name' => null, 'inputId' => null, 'labels' => [], 'locale' => null])
@php
    $N = \Nasaq\Nasaq::class;
    $locale ??= $N::rtl() ? 'ar' : str_replace('_', '-', app()->getLocale());
    $L = array_merge([
        'zone' => $N::t('Time zone', 'المنطقة الزمنية'),
        'zonePlaceholder' => $N::t('Search a city or an offset', 'ابحث عن مدينة أو فرق توقيت'),
        'zoneEmpty' => $N::t('No time zone matches. Try a city or an offset such as UTC+3.', 'لا توجد منطقة زمنية مطابقة. جرّب مدينة أو فرقًا مثل UTC+3.'),
        'useMine' => $N::t('Use my time zone', 'استخدام منطقتي الزمنية'),
        'yourZone' => $N::t('Your time zone', 'منطقتك الزمنية'),
        'open' => $N::t('Show time zones', 'عرض المناطق الزمنية'),
    ], (array) $labels);
    $aria = $attributes->get('aria-label') ?? $L['zone'];
    $instant = $now === null ? null : ($now instanceof \DateTimeInterface ? \DateTimeImmutable::createFromInterface($now) : (is_numeric($now) ? new \DateTimeImmutable('@'.(int) $now) : new \DateTimeImmutable($now)));
    $parts = $value ? explode('/', $value) : [];
    $text = $value ? str_replace('_', ' ', end($parts)).(count($parts) > 1 ? ', '.str_replace('_', ' ', $parts[0]) : '') : '';
    $options = array_filter([
        'value' => $value ?: null,
        'zones' => $zones ? array_values((array) $zones) : null,
        'reference' => $reference,
        'limit' => (int) $limit !== 60 ? (int) $limit : null,
        'hourCycle' => $hourCycle,
        'now' => $instant ? $instant->getTimestamp() * 1000 : null,
        'locale' => $locale,
        'labels' => $labels ?: null,
    ], fn ($v) => $v !== null);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'time-zone-field') }}" x-data="nqTimeZoneField({!! \Illuminate\Support\Js::from((object) $options) !!})" x-modelable="value" x-id="['nq-tz']"
    {{ $attributes->except(['data-slot', 'aria-label'])->cn('flex min-w-0 flex-col gap-2') }}>
    <div class="flex min-w-0 items-start gap-2">
        <div class="min-w-0 flex-1">
            <div data-slot="combobox-input-group" x-ref="anchor"
                class="flex min-h-control min-w-0 w-full h-control items-center gap-1 rounded-control border border-input bg-card ps-3 pe-1.5 text-body text-foreground transition-colors duration-150 ease-nq focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus has-[[data-invalid]]:border-nq-danger has-[[aria-invalid=true]]:border-nq-danger has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50">
                <input data-slot="combobox-input" x-ref="input" x-bind="input" @if ($inputId) id="{{ $inputId }}" @endif @if ($disabled) disabled @endif
                    value="{{ $text }}" placeholder="{{ $placeholder ?? $L['zonePlaceholder'] }}" aria-label="{{ $aria }}"
                    class="h-full min-w-0 flex-1 border-0 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]">
                <button data-slot="combobox-trigger" x-bind="trigger" aria-label="{{ $L['open'] }}" @if ($disabled) disabled @endif
                    class="flex size-6 shrink-0 cursor-default items-center justify-center rounded-control text-muted-foreground outline-none hover:text-foreground focus-visible:outline-1 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-chevrons-up-down /></button>
            </div>
            <template x-teleport="body">
                <div data-slot="combobox-content" x-ref="popup" x-bind="popup" x-nq-presence="open" x-anchor.bottom-start.offset.4="$refs.anchor"
                    class="z-50 w-[var(--anchor-width)] max-h-[min(var(--available-height),20rem)] min-w-[min(24rem,90vw)] overflow-y-auto rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
                    <div data-slot="combobox-empty" x-show="noMatches" x-cloak style="display: none" class="px-2.5 py-2 text-body-sm text-muted-foreground empty:hidden">{{ $L['zoneEmpty'] }}</div>
                    <div data-slot="combobox-list" class="outline-none">
                        <template x-for="(zone, i) in shown" :key="zone">
                            <div data-slot="combobox-item" role="option" :id="optionId(i)" :aria-selected="String(zone === value)" :data-selected="zone === value ? '' : null" :data-highlighted="i === highlighted ? '' : null"
                                x-on:pointermove="highlighted = i" x-on:click="pick(zone)"
                                class="relative flex h-auto min-h-9 cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 py-1.5 text-body-sm text-foreground outline-none data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50">
                                <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
                                    <span x-show="zone === value" x-cloak style="display: none" class="contents"><x-lucide-check class="size-4" /></span>
                                </span>
                                <span data-slot="combobox-item-text" class="min-w-0 flex-1 truncate">
                                    <span class="flex min-w-0 flex-1 items-center justify-between gap-3">
                                        <span class="flex min-w-0 flex-col">
                                            <span class="truncate text-body-sm text-foreground" x-text="city(zone)"></span>
                                            <span class="truncate text-caption text-muted-foreground" x-text="sub(zone)"></span>
                                        </span>
                                        <span class="flex shrink-0 flex-col items-end">
                                            <bdi dir="ltr" class="text-body-sm font-medium tabular-nums text-foreground" x-text="clockOf(zone)"></bdi>
                                            <bdi dir="ltr" class="font-mono text-caption text-muted-foreground" x-text="gap(zone)"></bdi>
                                        </span>
                                    </span>
                                </span>
                            </div>
                        </template>
                    </div>
                    <p x-show="truncated" x-cloak style="display: none" class="border-t border-border px-2.5 pt-2 pb-1 text-caption text-muted-foreground" x-text="truncatedText"></p>
                </div>
            </template>
        </div>
        @if ($showDetect)
            <x-nq::button type="button" variant="secondary" size="md" x-on:click="pickMine()" x-bind:disabled="mineDisabled()" :disabled="$disabled" class="shrink-0">
                <x-lucide-globe-2 aria-hidden="true" />
                <span class="max-sm:sr-only">{{ $L['useMine'] }}</span>
            </x-nq::button>
        @endif
    </div>
    @if ($name)<input type="hidden" name="{{ $name }}" x-bind:value="value ?? ''" value="{{ $value }}">@endif
    @if ($showClock)
        <x-nq::time-fields.time-zone-clock :time-zone="$value ?: 'UTC'" :reference="$reference" :seconds="$seconds" :hour-cycle="$hourCycle" :now="$now" :locale="$locale" :labels="$labels" size="sm"
            x-show="value" x-effect="value ? (timeZone = value) : null" :style="$value ? null : 'display: none'" class="rounded-control bg-nq-surface-soft px-3 py-2" />
    @endif
    <p x-show="yourZoneVisible" style="display: none" class="text-caption text-muted-foreground">{{ $L['yourZone'] }}</p>
</div>
