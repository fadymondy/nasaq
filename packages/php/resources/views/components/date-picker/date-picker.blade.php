{{-- <x-nq::date-picker x-model="date" min="2026-01-01" />
     An input-looking button that opens a calendar in a popover. Closes on pick.
     value: an ISO date "2026-09-15" or null; it is x-modelable (x-model / wire:model). placeholder (localised by default), disabled, invalid.
     min / max: ISO dates. disabled-dates: array of ISO dates. disabled-weekdays: array, 0 = Sunday. week-starts-on: 0 = Sunday ... 6 = Saturday.
     locale, dir, calendar (an Intl calendar for the labels, e.g. "islamic-umalqura"), name (a hidden input carries the ISO date), popup-label, aria-label.
     Inside <x-nq::field> it takes the field's name, disabled and invalid state. Needs the Alpine runtime (@nasaqScripts). --}}
@aware(['name' => null])
@props(['value' => null, 'placeholder' => null, 'min' => null, 'max' => null, 'disabledDates' => [], 'disabledWeekdays' => [], 'weekStartsOn' => null, 'locale' => null, 'dir' => null, 'calendar' => null, 'popupLabel' => null, 'today' => null, 'open' => false])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $rtl = $dir ? $dir === 'rtl' : $ar;
    $placeholder ??= \Nasaq\Nasaq::t('Select a date', 'اختر تاريخًا');
    $popupLabel ??= \Nasaq\Nasaq::t('Choose date', 'اختيار التاريخ');
    $fieldName = $attributes->get('name', $name);
    $init = ['value' => $value, 'locale' => $locale, 'calendar' => $calendar, 'placeholder' => $placeholder];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'date-picker') }}" x-data="nqDatePicker({!! \Illuminate\Support\Js::from($init) !!})" x-modelable="date" {{ $attributes->except('data-slot')->whereStartsWith(['x-model', 'wire:model'])->merge(['class' => 'contents']) }}>
    <x-nq::popover :open="$open">
        <x-nq::date-picker.trigger icon="calendar-days" :initial="$placeholder" {{ $attributes->whereDoesntStartWith(['x-model', 'wire:model'])->except('name') }} />
        @if ($fieldName)
            <input type="hidden" name="{{ $fieldName }}" x-bind:value="date ?? ''">
        @endif
        <x-nq::popover.content align="start" dir="{{ $rtl ? 'rtl' : 'ltr' }}" lang="{{ $locale }}" aria-label="{{ $popupLabel }}" class="w-auto max-w-[var(--available-width)] p-3"
            x-effect="date; $nextTick(() => close())">
            <x-nq::calendar x-model="date" :value="$value" :min="$min" :max="$max" :disabled="$disabledDates" :disabled-weekdays="$disabledWeekdays"
                :week-starts-on="$weekStartsOn" :locale="$locale" :dir="$rtl ? 'rtl' : 'ltr'" :calendar="$calendar" :today="$today" />
        </x-nq::popover.content>
    </x-nq::popover>
</div>
