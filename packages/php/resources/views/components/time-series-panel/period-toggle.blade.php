{{-- <x-nq::time-series-panel.period-toggle :value="28" x-model="days" />
     Segmented "7 days / 28 days / 90 days" control that pages use to set the reporting period. value: the selected number of days.
     options: period lengths in days (default 7, 28, 90). The group's value is an array holding the days as a string, x-modelable like <x-nq::toggle-group>:
     x-model="period" or wire:model. labels: array overriding the built-in words (period, lastDays with %d for the number). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => 28, 'options' => [7, 28, 90], 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? ['period' => 'الفترة', 'lastDays' => '%d يومًا'] : ['period' => 'Period', 'lastDays' => '%d days'], $labels);
@endphp
<x-nq::toggle-group :default-value="[(string) $value]" :aria-label="$t['period']" {{ $attributes }}>
    @foreach ($options as $n)
        <x-nq::toggle-group.toggle :value="(string) $n">{{ sprintf($t['lastDays'], $n) }}</x-nq::toggle-group.toggle>
    @endforeach
</x-nq::toggle-group>
