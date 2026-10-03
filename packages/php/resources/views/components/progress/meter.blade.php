{{-- <x-nq::progress.meter :value="42" label="Seats" value-text="42 of 50 seats" />
     A quantity against a limit (seats, storage, budget). It never animates. The fill turns warning past warn-at (0.8)
     and danger past danger-at (0.95); tone forces one. Same props as progress otherwise. --}}
@props(['value' => 0, 'warnAt' => 0.8, 'dangerAt' => 0.95, 'tone' => null, 'label' => null, 'showValue' => null, 'valueText' => null, 'size' => 'md', 'min' => 0, 'max' => 100, 'locale' => null])
@php
    $tones = ['default' => 'bg-primary', 'info' => 'bg-nq-info', 'success' => 'bg-nq-success', 'warning' => 'bg-nq-warning', 'danger' => 'bg-nq-danger'];
    $fraction = $max == $min ? 0 : ($value - $min) / ($max - $min);
    $derived = $tone ?? ($fraction >= $dangerAt ? 'danger' : ($fraction >= $warnAt ? 'warning' : 'default'));
    $locale ??= app()->getLocale();
    $formatted = class_exists(\NumberFormatter::class)
        ? (new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::PERCENT))->format($value / 100)
        : round($value).'%';
    $show = $showValue ?? ($label !== null);
    $id = 'nq-meter-'.substr(md5((string) $label), 0, 8);
    $fill = 'block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'meter') }}" data-tone="{{ $derived }}" role="meter" @if ($label !== null) aria-labelledby="{{ $id }}-label" @endif
    aria-valuemin="{{ $min }}" aria-valuemax="{{ $max }}" aria-valuenow="{{ $value }}" aria-valuetext="{{ $formatted }}"
    {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-1.5') }}>
    @if ($label !== null || $show)
        <div data-slot="progress-head" class="flex items-baseline justify-between gap-3 text-body-sm">
            @if ($label !== null)<span id="{{ $id }}-label" class="text-label text-foreground">{{ $label }}</span>@else<span></span>@endif
            @if ($show)<span aria-hidden="true" class="text-muted-foreground tabular-nums">{{ $valueText ?? $formatted }}</span>@endif
        </div>
    @endif
    <div data-slot="meter-track" class="relative block w-full overflow-hidden rounded-full bg-nq-surface-soft {{ $size === 'sm' ? 'h-1' : 'h-2' }}">
        <div data-slot="meter-indicator" style="inset-inline-start:0;width:{{ round(max(0, min(1, $fraction)) * 100, 4) }}%" class="{{ \Nasaq\Cn::merge($fill, $tones[$derived] ?? $tones['default']) }}"></div>
    </div>
</div>
