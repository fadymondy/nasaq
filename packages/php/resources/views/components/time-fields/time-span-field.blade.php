{{-- <x-nq::time-fields.time-span-field x-model="hours" />   <x-nq::time-fields.time-span-field :value="['start' => '22:00', 'end' => '06:00']" allow-overnight />
     A start and an end time side by side, for opening hours, shifts and quiet hours. Each side is a time field, so 800 and 1730 are enough. It shows how long the span is.
     value: { start: '09:00', end: '17:00' } (the default), x-modelable (x-model / wire:model). Fires a bubbling "change" ({ value }).
     allow-overnight: an end before the start means the next day (a night shift), shown with a badge; otherwise it is an error. show-duration (default true).
     step, min, max, disabled: passed to both fields. labels: override the strings.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'allowOvernight' => false, 'showDuration' => true, 'step' => null, 'min' => null, 'max' => null, 'disabled' => false, 'labels' => [], 'locale' => null])
@php
    $N = \Nasaq\Nasaq::class;
    $locale ??= $N::rtl() ? 'ar' : str_replace('_', '-', app()->getLocale());
    $L = array_merge(['span' => $N::t('Time span', 'المدة الزمنية'), 'start' => $N::t('Start', 'البداية'), 'end' => $N::t('End', 'النهاية'), 'overnight' => $N::t('Next day', 'اليوم التالي'), 'duration' => $N::t('Duration', 'المدة')], (array) $labels);
    $span = array_merge(['start' => '09:00', 'end' => '17:00'], (array) $value);
    $toMinutes = fn ($t) => preg_match('/^(\d{1,2}):(\d{2})$/', (string) $t, $m) ? ((int) $m[1]) * 60 + (int) $m[2] : null;
    $a = $toMinutes($span['start']);
    $b = $toMinutes($span['end']);
    $minutes = $a === null || $b === null ? null : ($b >= $a ? $b - $a : ($allowOvernight ? $b + 1440 - $a : null));
    $overnight = $allowOvernight && (string) $span['end'] < (string) $span['start'];
    $ar = str_starts_with($locale, 'ar');
    $h = $minutes === null ? 0 : intdiv($minutes, 60);
    $m = $minutes === null ? 0 : $minutes % 60;
    $duration = $minutes === null ? '' : implode(' ', array_filter([
        $h ? $h.($ar ? ' س' : 'h') : null,
        ($m || ! $h) ? $m.($ar ? ' د' : 'm') : null,
    ]));
    $options = array_filter(['value' => $span, 'allowOvernight' => $allowOvernight ? true : null, 'showDuration' => $showDuration, 'locale' => $locale, 'labels' => $labels ?: null], fn ($v) => $v !== null);
    $endBackwards = ! $allowOvernight && (string) $span['end'] !== '' && (string) $span['start'] !== '' && (string) $span['end'] < (string) $span['start'];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'time-span-field') }}" role="group" aria-label="{{ $L['span'] }}" x-data="nqTimeSpanField({!! \Illuminate\Support\Js::from((object) $options) !!})" x-modelable="span"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-1.5') }}>
    <div class="flex flex-wrap items-start gap-x-2 gap-y-1">
        <x-nq::time-fields.time-field x-model="span.start" x-on:change.stop="null" :value="$span['start']" :aria-label="$L['start']" :step="$step ?? 5" :min="$min" :max="$max" :disabled="$disabled" :labels="$labels" :locale="$locale" class="w-32" />
        <x-lucide-move-right aria-hidden="true" class="mt-2.5 size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
        <x-nq::time-fields.time-field x-model="span.end" x-effect="extError = endError" x-on:change.stop="null" :value="$span['end']" :aria-label="$L['end']" :step="$step ?? 5" :min="$min" :max="$max" :disabled="$disabled" :labels="$labels" :locale="$locale" :error="$endBackwards ? ($labels['endBeforeStart'] ?? $N::t('The end must be after the start.', 'يجب أن تكون النهاية بعد البداية.')) : null" class="w-32" />
        <x-nq::badge variant="info" x-show="overnight" :style="$overnight ? null : 'display: none'" class="mt-1.5" x-text="spanLabels.overnight">{{ $L['overnight'] }}</x-nq::badge>
    </div>
    @if ($showDuration)
        <p x-show="minutes !== null" @if ($minutes === null) style="display: none" @endif class="text-caption text-muted-foreground">{{ $L['duration'] }}: <bdi dir="ltr" class="font-medium text-foreground tabular-nums" x-text="durationText">{{ $duration }}</bdi></p>
    @endif
</div>
