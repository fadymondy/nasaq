{{-- <x-nq::chart-extras.progress-ring :value="72" label="Onboarding" caption="of 25 steps" />
     A ring that fills clockwise (counter-clockwise in RTL) with the figure in its middle; the default slot replaces the figure. A role=progressbar.
     value, max (100), min (0). tone: default | info | success | warning | danger | auto (warning from warn-at, danger from danger-at, with an
     icon, so meaning never rests on colour alone). size: diameter in px (96). thickness: stroke in a 100 unit box (8). caption: small text under
     the figure. label: required accessible name. value-text: read out with the value (default "<n>% complete"). labels: array overriding the words. --}}
@include('nasaq::components.chart-extras._logic')
@props(['value', 'max' => 100, 'min' => 0, 'tone' => 'default', 'warnAt' => 0.8, 'dangerAt' => 0.95, 'size' => 96, 'thickness' => 8, 'caption' => null, 'label', 'valueText' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_cx_words($locale, $labels);
    $fraction = nq_cx_ring_fraction($value, $max, $min);
    $resolved = $tone === 'auto' ? nq_cx_ring_tone($fraction, $warnAt, $dangerAt) : $tone;
    $geo = nq_cx_ring_geometry($fraction, $thickness);
    $stroke = ['default' => 'var(--primary)', 'info' => 'var(--nq-info)', 'success' => 'var(--nq-success)', 'warning' => 'var(--nq-warning)', 'danger' => 'var(--nq-danger)'][$resolved] ?? 'var(--primary)';
    $pct = nq_cx_number($fraction, $locale, 'percent', 0);
    $hasCaption = $caption !== null && $caption !== '';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'progress-ring') }}" data-tone="{{ $resolved }}" role="progressbar" aria-label="{{ $label }}" aria-valuemin="{{ $min }}" aria-valuemax="{{ $max }}" aria-valuenow="{{ min($max, max($min, $value)) }}" aria-valuetext="{{ $valueText ?? sprintf($t['ring'], $pct) }}" style="width: {{ $size }}px; height: {{ $size }}px" {{ $attributes->except('data-slot')->cn('relative inline-grid shrink-0 place-items-center') }}>
    <svg viewBox="0 0 100 100" aria-hidden="true" class="absolute inset-0 size-full -rotate-90 rtl:-scale-x-100 rtl:rotate-90">
        <circle cx="50" cy="50" r="{{ nq_cx_css($geo['radius']) }}" fill="none" stroke-width="{{ $thickness }}" class="stroke-nq-surface-soft" />
        @if ($fraction > 0)
            <circle cx="50" cy="50" r="{{ nq_cx_css($geo['radius']) }}" fill="none" stroke-width="{{ $thickness }}" stroke-linecap="{{ $fraction >= 1 ? 'butt' : 'round' }}" stroke-dasharray="{{ nq_cx_css($geo['dash']) }} {{ nq_cx_css($geo['gap']) }}" style="stroke: {{ $stroke }}" class="transition-[stroke-dasharray] duration-300 ease-nq motion-reduce:transition-none" />
        @endif
    </svg>
    <div class="relative flex max-w-[70%] flex-col items-center text-center leading-tight">
        <span class="inline-flex items-center gap-1 text-label tabular-nums text-foreground" style="font-size: {{ nq_cx_css(max(11, $size * 0.2)) }}px">
            @if ($resolved === 'danger' || $resolved === 'warning')<x-lucide-triangle-alert aria-hidden="true" class="size-[0.8em] shrink-0" />@endif
            @if ($slot->isNotEmpty()){{ $slot }}@else<x-nq::numeric :value="$fraction" style="percent" :max-fraction="0" />@endif
        </span>
        @if ($hasCaption)<span class="text-caption text-muted-foreground">{{ $caption }}</span>@endif
    </div>
</div>
