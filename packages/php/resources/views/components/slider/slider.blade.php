{{-- <x-nq::slider label="Volume" :value="40" />
     A draggable value or range picker (needs the Nasaq Alpine runtime). value: a number for one thumb, an array for a range
     (:value="[20, 80]"). label: visible name above the track; without it pass aria-label. show-value: the formatted value at the inline end
     (default true with a label). format: Intl options, e.g. ['style' => 'percent'] or ['style' => 'currency', 'currency' => 'USD', 'maximumFractionDigits' => 0].
     marks: [['value' => 0, 'label' => '$0'], ...] or true for one tick per step. thumb-labels: names of a range's thumbs.
     min, max, step, disabled, name (a hidden input per thumb), min-steps-between-thumbs. In RTL the track fills from the right and ArrowLeft raises the value.
     Bind it with x-modelable="model": <x-nq::slider x-model="volume" ... />. --}}
@props(['value' => null, 'label' => null, 'showValue' => null, 'format' => null, 'marks' => null, 'thumbLabels' => null, 'min' => 0, 'max' => 100, 'step' => 1, 'disabled' => false, 'name' => null, 'minStepsBetweenThumbs' => 0])
@php
    $locale = app()->getLocale();
    $isRange = is_array($value);
    $values = $isRange ? array_values($value) : [$value ?? $min];
    $withValue = $showValue ?? ($label !== null);
    $fmt = function (float|int $n) use ($format, $locale): string {
        $f = (array) ($format ?? []);
        $style = $f['style'] ?? 'decimal';
        if (! class_exists(\NumberFormatter::class)) {
            return (string) $n;
        }
        $nf = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', match ($style) {
            'percent' => \NumberFormatter::PERCENT,
            'currency' => \NumberFormatter::CURRENCY,
            default => \NumberFormatter::DECIMAL,
        });
        if (isset($f['maximumFractionDigits'])) {
            $nf->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, (int) $f['maximumFractionDigits']);
        }
        if (isset($f['minimumFractionDigits'])) {
            $nf->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, (int) $f['minimumFractionDigits']);
        }

        return $style === 'currency' ? $nf->formatCurrency($n, strtoupper($f['currency'] ?? \Nasaq\Nasaq::currency($locale))) : $nf->format($n);
    };
    $frac = fn ($v) => $max == $min ? 0 : ($v - $min) / ($max - $min);
    // The centre of a thumb: its share of the track, nudged so the 16px thumb never leaves the track.
    $offset = fn ($v) => 'calc('.round($frac($v) * 100, 4).'% + '.number_format(8 - $frac($v) * 16, 2, '.', '').'px)';
    $last = count($values) - 1;
    $rangeStyle = 'position: absolute; top: 0; bottom: 0; inset-inline-start: '.($isRange ? $offset($values[0]) : '0px').'; inset-inline-end: calc(100% - '.$offset($values[$last]).')';
    $ticks = [];
    if ($marks === true) {
        for ($v = $min; $v <= $max; $v += $step) {
            $ticks[] = ['value' => $v];
        }
    } elseif (is_array($marks)) {
        $ticks = $marks;
    }
    $config = ['value' => $isRange ? $values : $values[0], 'min' => $min, 'max' => $max, 'step' => $step, 'disabled' => (bool) $disabled, 'minStepsBetweenThumbs' => (int) $minStepsBetweenThumbs] + ($format ? ['format' => $format] : []);
    $uid = 'nq-slider-'.substr(md5(json_encode([$config, $label, $thumbLabels, $name])), 0, 8);
@endphp
<div data-slot="slider" x-data="nqSlider({{ \Illuminate\Support\Js::from($config) }})" x-modelable="model" @if ($disabled) data-disabled="" @endif
    {{ $attributes->cn('flex w-full flex-col gap-2 data-disabled:opacity-50') }}>
    @if ($label !== null || $withValue)
        <div data-slot="slider-head" class="flex items-baseline justify-between gap-3 text-body-sm">
            @if ($label !== null)<span id="{{ $uid }}-label" class="text-label text-foreground">{{ $label }}</span>@else<span></span>@endif
            @if ($withValue)<output data-slot="slider-value" class="text-muted-foreground tabular-nums"><bdi x-text="text">{{ implode(' – ', array_map($fmt, $values)) }}</bdi></output>@endif
        </div>
    @endif
    <div data-slot="slider-control" @if ($disabled) data-disabled="" @endif x-on:pointerdown="down($event)" class="flex h-5 w-full touch-none select-none items-center">
        <div data-slot="slider-track" x-ref="track" class="relative h-1.5 w-full rounded-full bg-nq-surface-soft">
            <div data-slot="slider-range" :style="rangeStyle()" style="{{ $rangeStyle }}" class="rounded-full bg-primary"></div>
            @foreach ($values as $i => $v)
                <div data-slot="slider-thumb" role="slider" tabindex="{{ $disabled ? -1 : 0 }}"
                    @if (($thumbLabels[$i] ?? null) !== null) aria-label="{{ $thumbLabels[$i] }}" @elseif ($label !== null) aria-labelledby="{{ $uid }}-label" @endif
                    aria-valuemin="{{ $min }}" aria-valuemax="{{ $max }}" aria-orientation="horizontal"
                    :aria-valuenow="values[{{ $i }}]" :aria-valuetext="fmt(values[{{ $i }}])" :data-dragging="dragging && active === {{ $i }} ? '' : undefined"
                    @if ($disabled) data-disabled="" aria-disabled="true" @endif
                    x-on:keydown="key($event, {{ $i }})" :style="thumbStyle({{ $i }})"
                    style="inset-inline-start: {{ $offset($v) }}; top: 50%; translate: -50% -50%; position: absolute"
                    class="size-4 rounded-full border border-primary bg-card shadow-xs outline-none transition-[box-shadow] duration-150 ease-nq motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-dragging:shadow-md data-disabled:pointer-events-none"></div>
                @if ($name)<input type="hidden" name="{{ $name }}" :value="values[{{ $i }}]" value="{{ $v }}" @if ($disabled) disabled @endif>@endif
            @endforeach
        </div>
    </div>
    @if (count($ticks))
        <div data-slot="slider-marks" aria-hidden="true" class="relative h-6 w-full">
            @foreach ($ticks as $mark)
                <span data-slot="slider-mark" style="inset-inline-start: {{ round($frac($mark['value']) * 100, 4) }}%"
                    class="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1 text-caption text-muted-foreground rtl:translate-x-1/2">
                    <span class="h-1.5 w-px bg-border"></span>
                    @if (isset($mark['label']))<span class="tabular-nums">{{ $mark['label'] }}</span>@endif
                </span>
            @endforeach
        </div>
    @endif
</div>
