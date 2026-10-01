{{-- <x-nq::gamification.unlock-toast :achievement="['id' => 'a', 'title' => 'Seven in a row', 'icon' => 'zap', 'rarity' => 'rare', 'xp' => 200]" :open="true" />   :duration="6000" :floating="true" has-view
     The celebration when something is earned: the medal pops in with a burst of dots; with prefers-reduced-motion it is a still card. The live region stays mounted and announces the title,
     so render it once and open it from the browser: window.dispatchEvent(new CustomEvent('nq-open')) on the toast, or el.dispatchEvent(new CustomEvent('nq-open')). It hides itself after duration ms
     (paused on hover or focus, 0 keeps it open) and dispatches nq-close; the View button (has-view) dispatches nq-view { id }. Needs the Alpine runtime. --}}
@props(['achievement', 'open' => false, 'duration' => 6000, 'floating' => true, 'hasView' => false, 'labels' => [], 'locale' => null])
@include('nasaq::components.gamification._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_gm_words($locale, $labels);
    $a = $achievement;
    $rarity = $a['rarity'] ?? 'common';
    $s = nq_gm_rarity_style($rarity);
    $a['earnedAt'] ??= now();
@endphp
<div role="status" aria-live="polite" data-slot="achievement-unlock-toast" x-data="nqUnlockToast(@js((int) $duration), @js((bool) $open))" x-on:nq-open="show()"
    {{ $attributes->cn($floating ? 'pointer-events-none fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:end-4 sm:w-96' : 'w-full') }}>
    <div x-ref="card" x-show="open" data-rarity="{{ $rarity }}" style="{{ $open ? '' : 'display: none' }}"
        x-on:pointerenter="pause()" x-on:pointerleave="resume()" x-on:focusin="pause()" x-on:focusout="resume()"
        class="{{ \Nasaq\Cn::merge('pointer-events-auto relative flex items-center gap-3 rounded-floating border bg-popover p-3 text-popover-foreground shadow-floating', $s['ring']) }}">
        <span class="relative shrink-0">
            <span x-ref="medal" class="inline-block"><x-nq::gamification.medal :achievement="$a" size="md" /></span>
            <span x-ref="burst" aria-hidden="true" class="pointer-events-none absolute inset-0">
                @for ($i = 0; $i < 10; $i++)
                    <span class="absolute start-1/2 top-1/2 size-1.5 rounded-full opacity-0 {{ $i % 3 === 0 ? 'bg-nq-accent' : ($i % 3 === 1 ? 'bg-nq-success' : 'bg-nq-info') }}"></span>
                @endfor
            </span>
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="text-eyebrow text-nq-accent-text">{{ $t['unlocked'] }}</span>
            <span dir="auto" class="truncate text-label text-foreground">{{ $a['title'] }}</span>
            <span class="flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground">
                <span>{{ $t['rarity'][$rarity] ?? $rarity }}</span>
                @if (! empty($a['xp']))<span class="text-nq-accent-text">{{ nq_gm_say($t, 'xpReward', nq_gm_num($a['xp'], $locale)) }}</span>@endif
            </span>
        </div>
        @if ($hasView)
            <x-nq::button size="sm" variant="secondary" data-id="{{ $a['id'] }}" x-on:click="view($el.dataset.id)">{{ $t['view'] }}</x-nq::button>
        @endif
        <x-nq::button variant="ghost" size="icon-sm" :aria-label="$t['dismiss']" x-on:click="close()"><x-lucide-x aria-hidden="true" /></x-nq::button>
    </div>
</div>
