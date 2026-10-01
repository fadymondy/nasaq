{{-- <x-nq::date-picker.range x-model="period" />
     An input-looking button that opens a range calendar in a popover. Closes when both ends are chosen.
     value: ['from' => '2026-09-08', 'to' => '2026-09-12'] (ISO dates, null for an open end); it is x-modelable (x-model / wire:model) as { from, to }.
     number-of-months: 1 | 2 (default 2; the calendar wraps on a narrow screen). placeholder (localised by default), disabled, invalid.
     min / max: ISO dates. disabled-dates: array of ISO dates. disabled-weekdays: array, 0 = Sunday. week-starts-on, locale, dir, calendar, popup-label, aria-label.
     name: hidden inputs "name-from" and "name-to" carry the ISO dates. Inside <x-nq::field> it takes the field's name, disabled and invalid state.
     Needs the Alpine runtime (@nasaqScripts). --}}
@aware(['name' => null])
@props(['value' => null, 'numberOfMonths' => 2, 'placeholder' => null, 'min' => null, 'max' => null, 'disabledDates' => [], 'disabledWeekdays' => [], 'weekStartsOn' => null, 'locale' => null, 'dir' => null, 'calendar' => null, 'popupLabel' => null, 'today' => null, 'open' => false])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $rtl = $dir ? $dir === 'rtl' : $ar;
    $placeholder ??= \Nasaq\Nasaq::t('Select dates', 'اختر التواريخ');
    $popupLabel ??= \Nasaq\Nasaq::t('Choose date', 'اختيار التاريخ');
    $fieldName = $attributes->get('name', $name);
    $range = ['from' => is_array($value) ? ($value['from'] ?? null) : null, 'to' => is_array($value) ? ($value['to'] ?? null) : null];
    $init = ['value' => $range, 'locale' => $locale, 'calendar' => $calendar, 'placeholder' => $placeholder];
@endphp
<div data-slot="date-range-picker" x-data="nqDateRangePicker({!! \Illuminate\Support\Js::from($init) !!})" x-modelable="period" {{ $attributes->whereStartsWith(['x-model', 'wire:model'])->merge(['class' => 'contents']) }}>
    <x-nq::popover :open="$open">
        <x-nq::date-picker.trigger icon="calendar-days" :initial="$placeholder" {{ $attributes->whereDoesntStartWith(['x-model', 'wire:model'])->except('name') }} />
        @if ($fieldName)
            <input type="hidden" name="{{ $fieldName }}-from" x-bind:value="period.from ?? ''">
            <input type="hidden" name="{{ $fieldName }}-to" x-bind:value="period.to ?? ''">
        @endif
        <x-nq::popover.content align="start" dir="{{ $rtl ? 'rtl' : 'ltr' }}" lang="{{ $locale }}" aria-label="{{ $popupLabel }}" class="w-auto max-w-[var(--available-width)] p-3"
            x-effect="period.from && period.to && $nextTick(() => close())">
            <x-nq::calendar mode="range" x-model="period" :value="$range" :number-of-months="$numberOfMonths" :min="$min" :max="$max" :disabled="$disabledDates" :disabled-weekdays="$disabledWeekdays"
                :week-starts-on="$weekStartsOn" :locale="$locale" :dir="$rtl ? 'rtl' : 'ltr'" :calendar="$calendar" :today="$today" />
        </x-nq::popover.content>
    </x-nq::popover>
</div>
