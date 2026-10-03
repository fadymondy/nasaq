{{-- <x-nq::gamification.medal :achievement="['id' => 'a', 'title' => 'First order', 'icon' => 'rocket', 'rarity' => 'rare', 'progress' => 3, 'goal' => 6]" size="lg" />
     The round badge. Earned: solid ring in the rarity colour. In progress: the ring fills as the goal is reached. Locked: dashed and dimmed with a lock.
     Decorative; the words that go with it carry the state. size: sm | md | lg. achievement.icon is a lucide name (default trophy). --}}
@props(['achievement', 'size' => 'md'])
@include('nasaq::components.gamification._logic')
@php
    $status = nq_gm_status($achievement);
    $pct = nq_gm_percent($achievement);
    $rarity = $achievement['rarity'] ?? 'common';
    $s = nq_gm_rarity_style($rarity);
    $dim = ['sm' => ['box' => 'size-14', 'icon' => 'size-6', 'ring' => 56], 'md' => ['box' => 'size-16', 'icon' => 'size-7', 'ring' => 64], 'lg' => ['box' => 'size-24', 'icon' => 'size-10', 'ring' => 96]][$size] ?? ['box' => 'size-16', 'icon' => 'size-7', 'ring' => 64];
    $stroke = 4;
    $radius = ($dim['ring'] - $stroke) / 2;
    $circumference = 2 * M_PI * $radius;
    $glyph = 'lucide-'.($achievement['icon'] ?? 'trophy');
@endphp
<span aria-hidden="true" data-slot="achievement-medal" data-status="{{ $status }}" data-rarity="{{ $rarity }}"
    {{ $attributes->cn(['relative inline-grid shrink-0 place-items-center rounded-full', $dim['box']]) }}>
    @if ($status === 'in-progress')
        <svg viewBox="0 0 {{ $dim['ring'] }} {{ $dim['ring'] }}" class="{{ \Nasaq\Cn::merge('absolute inset-0 -rotate-90 rtl:scale-x-[-1]', $s['text']) }}">
            <circle cx="{{ $dim['ring'] / 2 }}" cy="{{ $dim['ring'] / 2 }}" r="{{ $radius }}" fill="none" stroke-width="{{ $stroke }}" class="stroke-nq-line" />
            <circle cx="{{ $dim['ring'] / 2 }}" cy="{{ $dim['ring'] / 2 }}" r="{{ $radius }}" fill="none" stroke-width="{{ $stroke }}" stroke-linecap="round" stroke-dasharray="{{ round($circumference, 4) }}" stroke-dashoffset="{{ round($circumference * (1 - $pct / 100), 4) }}" class="stroke-current transition-[stroke-dashoffset] duration-300 ease-nq motion-reduce:transition-none" />
        </svg>
    @else
        <span class="absolute inset-0 rounded-full border-2 {{ $status === 'earned' ? $s['ring'].' '.$s['soft'] : 'border-dashed border-nq-line-strong bg-secondary' }}"></span>
    @endif
    <span class="{{ \Nasaq\Cn::merge('relative grid place-items-center rounded-full', $status === 'in-progress' ? 'size-[72%]' : 'size-[68%]', $status === 'in-progress' ? $s['soft'] : '') }}">
        @if ($status === 'locked')
            <x-lucide-lock class="text-muted-foreground {{ $size === 'lg' ? 'size-8' : 'size-5' }}" />
        @else
            <x-dynamic-component :component="$glyph" class="{{ \Nasaq\Cn::merge($dim['icon'], $s['text'], $status === 'in-progress' ? 'opacity-80' : '') }}" />
        @endif
    </span>
</span>
