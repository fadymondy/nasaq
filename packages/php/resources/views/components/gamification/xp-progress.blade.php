{{-- <x-nq::gamification.xp-progress :total-xp="260" />   :curve="['base' => 100, 'growth' => 1.5]"
     The level and how far into it you are: a level number, "260 / 350 XP" and what is left to the next one. total-xp is lifetime XP. --}}
@props(['totalXp', 'curve' => [], 'labels' => [], 'locale' => null])
@include('nasaq::components.gamification._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_gm_words($locale, $labels);
    $p = nq_gm_level($totalXp, $curve);
    $levelText = nq_gm_say($t, 'level', nq_gm_num($p['level'], $locale));
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'xp-progress') }}" data-level="{{ $p['level'] }}" {{ $attributes->except('data-slot')->cn('flex items-center gap-3') }}>
    <span aria-hidden="true" class="grid size-12 shrink-0 place-items-center rounded-full border-2 border-nq-accent bg-nq-accent/15 text-h3 tabular-nums text-nq-accent-text">{{ nq_gm_num($p['level'], $locale) }}</span>
    <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <div class="flex items-baseline justify-between gap-2">
            <span class="text-label text-foreground">{{ $levelText }}</span>
            <span class="text-caption tabular-nums text-muted-foreground"><bdi>{{ nq_gm_say($t, 'xpOf', nq_gm_num($p['xp'], $locale), nq_gm_num($p['span'], $locale)) }}</bdi></span>
        </div>
        <x-nq::progress :value="$p['percent']" size="sm" :aria-label="$levelText" :locale="$locale" />
        <span class="text-caption text-muted-foreground"><bdi>{{ nq_gm_say($t, 'xpToNext', nq_gm_num($p['remaining'], $locale), nq_gm_num($p['level'] + 1, $locale)) }}</bdi></span>
    </div>
</div>
