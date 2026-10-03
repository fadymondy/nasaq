{{-- <x-nq::date-picker.time x-model="time" :minute-step="15" />
     Hour, minute (and AM/PM) selects. value: a 24-hour "HH:mm" string or null; it is x-modelable (x-model / wire:model).
     hour-cycle: 12 | 24 (default: what the locale uses). minute-step: minutes between options (default 1). disabled, locale, dir, name (a hidden input carries the value), aria-label.
     The hour select is the <x-nq::field> control. Needs the Alpine runtime (@nasaqScripts). --}}
@aware(['invalid' => false, 'disabled' => false, 'name' => null])
@props(['value' => null, 'hourCycle' => null, 'minuteStep' => 1, 'locale' => null, 'dir' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $rtl = $dir ? $dir === 'rtl' : $ar;
    $t = fn ($en, $arabic) => $ar ? $arabic : $en;
    $fieldName = $attributes->get('name', $name);
    $cycle = (int) ($hourCycle ?? (class_exists(\IntlDateFormatter::class) && preg_match('/[Hk]/', (string) (new \IntlDateFormatter($locale, \IntlDateFormatter::NONE, \IntlDateFormatter::SHORT))->getPattern()) ? 24 : 12));
    $step = max(1, (int) $minuteStep);
    $hours = $cycle === 12 ? range(1, 12) : range(0, 23);
    $minutes = range(0, 59, $step);
    $two = fn ($n) => str_pad((string) $n, 2, '0', STR_PAD_LEFT);
    $periods = $ar ? ['ص', 'م'] : ['AM', 'PM'];
    $init = ['value' => $value, 'locale' => $locale, 'hourCycle' => $cycle];
    $select = [
        'h-control min-h-[var(--nq-touch-min,0px)] appearance-none rounded-control border border-input bg-card px-2.5 text-center text-body tabular-nums text-foreground outline-none transition-colors duration-150 ease-nq',
        'focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus',
        'data-invalid:border-nq-danger aria-invalid:border-nq-danger disabled:cursor-not-allowed disabled:opacity-50',
        'pointer-coarse:text-[16px]',
    ];
    $selected = $value ? array_map('intval', explode(':', (string) $value)) : [null, null];
@endphp
<div role="group" dir="{{ $rtl ? 'rtl' : 'ltr' }}" lang="{{ $locale }}" data-slot="{{ $attributes->get('data-slot', 'time-picker') }}" x-data="nqTimePicker({!! \Illuminate\Support\Js::from($init) !!})" x-modelable="time"
    {{ $attributes->except('data-slot')->except(['name'])->cn('inline-flex items-center gap-1.5') }}>
    <select x-model="hourModel" aria-label="{{ $t('Hour', 'الساعة') }}" data-slot="time-picker-hour" @if ($disabled) disabled @endif
        @if ($invalid) data-invalid aria-invalid="true" @endif {{ (new \Illuminate\View\ComponentAttributeBag)->cn($select) }}>
        <option value="" disabled hidden>--</option>
        @foreach ($hours as $h)
            <option value="{{ $h }}" @selected($selected[0] !== null && ($cycle === 12 ? ($selected[0] % 12 ?: 12) : $selected[0]) === $h)>{{ $cycle === 12 ? $h : $two($h) }}</option>
        @endforeach
    </select>
    <span aria-hidden="true" class="text-muted-foreground">:</span>
    <select x-model="minuteModel" aria-label="{{ $t('Minute', 'الدقيقة') }}" data-slot="time-picker-minute" @if ($disabled) disabled @endif {{ (new \Illuminate\View\ComponentAttributeBag)->cn($select) }}>
        <option value="" disabled hidden>--</option>
        @foreach ($minutes as $m)
            <option value="{{ $m }}" @selected($selected[1] === $m)>{{ $two($m) }}</option>
        @endforeach
    </select>
    @if ($cycle === 12)
        <select x-model="periodModel" aria-label="{{ $t('AM/PM', 'ص/م') }}" data-slot="time-picker-period" @if ($disabled) disabled @endif {{ (new \Illuminate\View\ComponentAttributeBag)->cn($select) }}>
            <option value="am" @selected($selected[0] === null || $selected[0] < 12)>{{ $periods[0] }}</option>
            <option value="pm" @selected($selected[0] !== null && $selected[0] >= 12)>{{ $periods[1] }}</option>
        </select>
    @endif
    @if ($fieldName)
        <input type="hidden" name="{{ $fieldName }}" x-bind:value="time ?? ''">
    @endif
    <x-lucide-clock aria-hidden="true" class="ms-1 size-4 shrink-0 text-muted-foreground" />
</div>
