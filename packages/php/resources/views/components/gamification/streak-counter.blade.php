{{-- <x-nq::gamification.streak-counter :current="12" :longest="30" />   at-risk
     The flame and the number of days in a row. The longest run and a nudge when today is still open. at-risk: today is not done yet and the streak breaks tonight. --}}
@props(['current', 'longest' => null, 'atRisk' => false, 'labels' => [], 'locale' => null])
@include('nasaq::components.gamification._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_gm_words($locale, $labels);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'streak-counter') }}" @if ($atRisk) data-at-risk @endif {{ $attributes->except('data-slot')->cn('flex items-center gap-3') }}>
    <span aria-hidden="true" class="grid size-12 shrink-0 place-items-center rounded-full {{ $current > 0 ? 'bg-nq-warning-soft text-nq-warning-text' : 'bg-secondary text-muted-foreground' }}">
        <x-lucide-flame class="size-6 {{ $current > 0 ? 'fill-current' : '' }}" />
    </span>
    <div class="flex min-w-0 flex-col">
        <span class="flex items-baseline gap-1.5">
            <span class="text-h2 tabular-nums text-foreground">{{ nq_gm_num($current, $locale) }}</span>
            <span class="text-body-sm text-muted-foreground">{{ $t['streak'] }}</span>
        </span>
        <span class="text-caption text-muted-foreground">@if ($atRisk)<span class="text-nq-warning-text">{{ $t['atRisk'] }}</span>@elseif ($longest !== null){{ nq_gm_say($t, 'longest', nq_gm_num($longest, $locale)) }}@endif</span>
    </div>
</div>
