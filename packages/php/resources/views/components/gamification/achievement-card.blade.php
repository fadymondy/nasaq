{{-- <x-nq::gamification.achievement-card :achievement="['id' => 'a', 'title' => 'Seven in a row', 'description' => 'Order seven days running.', 'icon' => 'zap', 'rarity' => 'rare', 'progress' => 4, 'goal' => 7, 'xp' => 200]"><x-slot:actions>...</x-slot:actions></x-nq::gamification.achievement-card>
     One achievement in full: the badge, what it takes, how far along, when it was earned and what it pays. The actions slot goes under the description. --}}
@props(['achievement', 'actions' => null, 'labels' => [], 'locale' => null])
@include('nasaq::components.gamification._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_gm_words($locale, $labels);
    $a = $achievement;
    $status = nq_gm_status($a);
    $hidden = ! empty($a['secret']) && $status !== 'earned';
    $goal = ($a['goal'] ?? 0) > 0 ? $a['goal'] : 1;
    $titleId = 'nq-ach-'.substr(md5(($a['id'] ?? '').($a['title'] ?? '')), 0, 8);
    $earnedOn = null;
    if ($status === 'earned' && ! empty($a['earnedAt'])) {
        $earnedOn = true;
    }
@endphp
<div role="group" aria-labelledby="{{ $titleId }}" data-slot="achievement-card" data-status="{{ $status }}"
    {{ $attributes->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground min-w-0') }}>
    <div data-slot="card-content" class="flex flex-col items-center gap-4 px-4 text-center sm:flex-row sm:items-start sm:text-start">
        <x-nq::gamification.medal :achievement="$hidden ? array_diff_key($a, ['icon' => 1]) : $a" size="lg" />
        <div class="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
            <div class="flex flex-col items-center gap-1.5 sm:items-start">
                <div class="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                    <x-nq::gamification.rarity-badge :rarity="$a['rarity'] ?? 'common'" :labels="$labels" :locale="$locale" />
                    @if (! empty($a['xp']))
                        <x-nq::badge variant="accent"><x-lucide-sparkles aria-hidden="true" />{{ nq_gm_say($t, 'xpReward', nq_gm_num($a['xp'], $locale)) }}</x-nq::badge>
                    @endif
                </div>
                <h3 data-slot="card-title" id="{{ $titleId }}" class="{{ \Nasaq\Cn::merge('text-label text-foreground', 'text-body') }}"><span dir="auto">{{ $hidden ? $t['secret'] : $a['title'] }}</span></h3>
                <div data-slot="card-description" class="text-body-sm text-muted-foreground"><span dir="auto">{{ $hidden ? $t['secretHint'] : ($a['description'] ?? '') }}</span></div>
            </div>
            @if ($status === 'earned')
                <p class="inline-flex items-center gap-1.5 text-body-sm text-nq-success-text">
                    <x-lucide-check aria-hidden="true" class="size-4" />
                    @if ($earnedOn){{ nq_gm_say($t, 'earnedOn', nq_gm_date($a['earnedAt'], $locale)) }}@else{{ $t['earned'] }}@endif
                </p>
            @else
                <x-nq::progress :value="nq_gm_percent($a)" :label="$status === 'locked' ? $t['locked'] : $t['inProgress']" :value-text="nq_gm_say($t, 'progressOf', nq_gm_num($a['progress'] ?? 0, $locale), nq_gm_num($goal, $locale))" :locale="$locale" class="w-full max-w-sm" />
            @endif
            @if ($actions && ! $actions->isEmpty())<div class="flex flex-wrap gap-2">{{ $actions }}</div>@endif
        </div>
    </div>
</div>
