{{-- <x-nq::gamification.streak-card :active-days="['2026-09-19', '2026-09-20']" />   :today :week-start
     The counter and the calendar together, with the numbers worked out from the active days. --}}
@props(['activeDays' => [], 'today' => null, 'weekStart' => null, 'labels' => [], 'locale' => null])
@include('nasaq::components.gamification._logic')
@php
    $locale ??= app()->getLocale();
    $todayKey = nq_gm_day_key($today ?? now());
    $stats = nq_gm_streak($activeDays, $todayKey);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'streak-card') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground min-w-0') }}>
    <div data-slot="card-content" class="flex flex-col gap-4 px-4">
        <x-nq::gamification.streak-counter :current="$stats['current']" :longest="$stats['longest']" :at-risk="$stats['atRisk']" :labels="$labels" :locale="$locale" />
        <x-nq::gamification.streak-calendar :active-days="$activeDays" :today="$todayKey" :week-start="$weekStart" :labels="$labels" :locale="$locale" class="max-w-none" />
    </div>
</div>
