{{-- <x-nq::progress :value="64" label="Uploading files" />
     value: 0..100 (min/max change the range); omit or null for indeterminate. tone: default | info | success | warning | danger. size: sm | md.
     show-value (default: when label is set), value-text replaces "64%". For a quantity against a limit use <x-nq::progress.meter>.
     Live value: value-expr="upload.percent" (an Alpine expression, re-read whenever it changes; null = indeterminate) or x-model="percent" on the
     component (both need the Alpine runtime). :value is still the server-rendered first paint. Keep the expression free of && < > and apostrophes
     when it is passed through another x-nq:: component's attributes. --}}
@props(['value' => null, 'tone' => 'default', 'label' => null, 'showValue' => null, 'valueText' => null, 'size' => 'md', 'min' => 0, 'max' => 100, 'locale' => null, 'currency' => null, 'valueExpr' => null])
@php
    $tones = ['default' => 'bg-primary', 'info' => 'bg-nq-info', 'success' => 'bg-nq-success', 'warning' => 'bg-nq-warning', 'danger' => 'bg-nq-danger'];
    $indeterminate = $value === null;
    $fraction = $max == $min ? 0 : (($value ?? 0) - $min) / ($max - $min);
    $locale ??= app()->getLocale();
    $formatted = null;
    if (! $indeterminate) {
        $pct = $value / 100;
        if (class_exists(\NumberFormatter::class)) {
            $formatted = (new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::PERCENT))->format($pct);
        } else {
            $formatted = round($value).'%';
        }
    }
    $show = $showValue ?? ($label !== null);
    $status = $indeterminate ? 'indeterminate' : ($value >= $max ? 'complete' : 'progressing');
    $state = 'data-'.$status;
    $id = 'nq-progress-'.substr(md5((string) $label), 0, 8);
    $reactive = $valueExpr !== null || $attributes->whereStartsWith('x-model')->isNotEmpty();
    $config = ['value' => $value, 'min' => $min, 'max' => $max, 'locale' => $locale, 'fixedText' => $valueText !== null];
    $fill = 'block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'progress') }}" data-tone="{{ $tone }}" role="progressbar" @if ($label !== null) aria-labelledby="{{ $id }}-label" @endif
    aria-valuemin="{{ $min }}" aria-valuemax="{{ $max }}" @if (! $indeterminate) aria-valuenow="{{ $value }}" @endif
    aria-valuetext="{{ $indeterminate ? 'indeterminate progress' : $formatted }}" {{ $state }}{!! $reactive ? ' x-data="nqProgress('.\Illuminate\Support\Js::from($config).')" x-modelable="value" x-effect="sync('.e($valueExpr ?? 'value').')"' : '' !!}
    {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-1.5') }}>
    @if ($label !== null || $show)
        <div data-slot="progress-head" class="flex items-baseline justify-between gap-3 text-body-sm">
            @if ($label !== null)<span id="{{ $id }}-label" class="text-label text-foreground">{{ $label }}</span>@else<span></span>@endif
            @if ($show && ($reactive || ! $indeterminate))<span aria-hidden="true"{!! $reactive ? ' data-progress-value'.($indeterminate ? ' hidden' : '') : '' !!} class="text-muted-foreground tabular-nums">{{ $valueText ?? $formatted }}</span>@endif
        </div>
    @endif
    <div data-slot="progress-track" {{ $state }} class="relative block w-full overflow-hidden rounded-full bg-nq-surface-soft {{ $size === 'sm' ? 'h-1' : 'h-2' }}">
        <div data-slot="progress-indicator" {{ $state }} style="inset-inline-start:0;@if (! $indeterminate)width:{{ round($fraction * 100, 4) }}%@endif"
            class="{{ \Nasaq\Cn::merge($fill, $tones[$tone] ?? $tones['default'], $indeterminate ? 'w-full motion-safe:animate-pulse' : '') }}"></div>
    </div>
</div>
