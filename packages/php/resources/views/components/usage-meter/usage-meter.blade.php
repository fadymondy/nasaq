{{-- <x-nq::usage-meter label="Seats" :used="46" :limit="50" unit="seats" />
     A quantity used against its limit: a count, money or hours. The bar turns warning at 75% and danger at 90% (thresholds: ['warnAt' => 0.75, 'dangerAt' => 0.9]),
     and past the limit it says by how much, with an icon and text, never colour alone. limit null is unlimited: no bar, an Unlimited badge.
     kind: count (default, with unit) | money (currency, default USD or SAR in Arabic) | hours. marker: fraction 0..1 of the period gone, draws a tick.
     hint: end-of-row text that replaces the remaining amount (a string or <x-slot:hint>). label may be a string or <x-slot:label>; aria-label names the meter
     when the label is a slot. size: sm | md. labels: array overriding the built-in words. Static: no Alpine needed.
     Siblings: <x-nq::usage-meter.budget-burn>, <x-nq::usage-meter.summary>. --}}
@include('nasaq::components.usage-meter._logic')
@props(['label' => null, 'used' => 0, 'limit' => null, 'kind' => 'count', 'unit' => null, 'currency' => null, 'thresholds' => [], 'marker' => null, 'hint' => null, 'size' => 'md', 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_um_words($locale, $labels);
    $tone = nq_um_tone($used, $limit, $thresholds);
    $amount = fn ($n) => nq_um_amount($n, $kind, $locale, $t, $unit, $currency);
    $name = $attributes->get('aria-label') ?? (is_string($label) ? $label : null);
    $statusText = ['ok' => '', 'warning' => 'text-nq-warning-text', 'danger' => 'text-nq-danger-text', 'over' => 'text-nq-danger-text'];
    $meterTone = ['ok' => 'default', 'warning' => 'warning', 'danger' => 'danger', 'over' => 'danger'];
    $hasHint = $hint !== null && (string) $hint !== '';
@endphp
<div data-slot="usage-meter" data-tone="{{ $tone }}" @if ($limit === null) data-unlimited="true" @endif {{ $attributes->except('aria-label')->cn('flex min-w-0 flex-col gap-1.5') }}>
    <div class="flex items-baseline justify-between gap-3 text-body-sm">
        <span data-slot="usage-meter-label" class="min-w-0 truncate text-label text-foreground">{{ $label }}</span>
        <span data-slot="usage-meter-value" class="shrink-0 text-muted-foreground tabular-nums"><bdi class="text-foreground">{{ $amount($used) }}</bdi>@if ($limit !== null) {{ $t['of'] }} <bdi>{{ $amount($limit) }}</bdi>@endif</span>
    </div>
    @if ($limit === null)
        <div>
            <span data-slot="usage-meter-unlimited" class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-border bg-secondary px-1.5 text-caption font-medium text-foreground [&_svg]:size-3"><x-lucide-infinity aria-hidden="true" />{{ $t['unlimited'] }}</span>
        </div>
    @else
        <div class="relative">
            <x-nq::progress.meter
                :aria-label="$name"
                :size="$size"
                :value="$limit > 0 ? min($used, $limit) : ($used > 0 ? 1 : 0)"
                :max="$limit > 0 ? $limit : 1"
                :tone="$meterTone[$tone]"
                :value-text="$amount($used).' '.$t['of'].' '.$amount($limit)"
                :locale="$locale" />
            @if ($marker !== null)
                <span data-slot="usage-meter-marker" aria-hidden="true" class="pointer-events-none absolute -top-0.5 -bottom-0.5 w-0.5 rounded-full bg-foreground/60" style="inset-inline-start:{{ min(100, max(0, $marker * 100)) }}%"></span>
            @endif
        </div>
        @if ($tone !== 'ok' || $hasHint || $limit > $used)
            <div class="flex flex-wrap items-center justify-between gap-x-3 text-caption text-muted-foreground">
                @if ($tone !== 'ok')
                    <span data-slot="usage-meter-status" @if ($tone === 'over') role="alert" @endif class="inline-flex items-center gap-1 text-label {{ $statusText[$tone] }}">
                        @if ($tone === 'warning')<x-lucide-triangle-alert aria-hidden="true" class="size-3.5 shrink-0" />@else<x-lucide-circle-alert aria-hidden="true" class="size-3.5 shrink-0" />@endif
                        {{ $tone === 'over' ? nq_um_fill($t['over'], $amount($used - $limit)) : ($tone === 'danger' ? $t['danger'] : $t['warning']) }}
                    </span>
                @else
                    <span></span>
                @endif
                @if ($hasHint)
                    <span>{{ $hint }}</span>
                @elseif ($tone !== 'over')
                    <span>{{ nq_um_fill($t['left'], $amount(max(0, $limit - $used))) }}</span>
                @endif
            </div>
        @endif
    @endif
</div>
