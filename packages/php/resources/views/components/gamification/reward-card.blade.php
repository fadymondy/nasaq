{{-- <x-nq::gamification.reward-card title="Free delivery" description="One order, on us." rarity="rare" :cost="500" :balance="620" claimable />
     A reward or collectible: the art, its rarity, what it costs and a Claim button that handles its own progress and errors. The named slot "art" is the picture (default: a gift icon).
     status: available | owned | locked. locked-reason: why it is locked. balance: the points the person has (says how many more are needed). cost-unit: default "points" (localised).
     claimable: shows an enabled Claim button. Claiming (Alpine runtime) dispatches a bubbling nq-claim event. A listener may set event.detail.wait to a promise; its failure, or a resolved { error: '...' },
     is shown under the button. Without a listener the button just finishes. --}}
@props(['title', 'description' => null, 'rarity' => 'common', 'cost' => null, 'costUnit' => null, 'balance' => null, 'status' => 'available', 'lockedReason' => null, 'claimable' => false, 'art' => null, 'labels' => [], 'locale' => null])
@include('nasaq::components.gamification._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_gm_words($locale, $labels);
    $s = nq_gm_rarity_style($rarity);
    $short = ($cost !== null && $balance !== null && $balance < $cost) ? $cost - $balance : 0;
    $canClaim = $status === 'available' && $short === 0 && $claimable;
    $btn = 'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--nq-action)_88%,var(--nq-fg))] h-control-sm px-2.5';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'reward-card') }}" data-status="{{ $status }}" data-rarity="{{ $rarity }}" x-data="nqRewardCard(@js($t['failed']))"
    {{ $attributes->except('data-slot')->cn('flex flex-col rounded-card border border-border bg-card text-card-foreground min-w-0 gap-3 overflow-hidden py-0', $status === 'locked' ? 'opacity-80' : '') }}>
    <div class="grid h-32 place-items-center border-b [&_svg]:size-12 {{ $s['soft'] }} {{ $s['ring'] }} {{ $s['text'] }}">
        @if ($art && ! $art->isEmpty()){{ $art }}@else<x-lucide-gift aria-hidden="true" />@endif
    </div>
    <div data-slot="card-header" class="grid auto-rows-min items-start gap-1 px-4">
        <h3 data-slot="card-title" class="flex flex-wrap items-center gap-1.5 text-label text-foreground">
            <span dir="auto">{{ $title }}</span>
            <x-nq::gamification.rarity-badge :rarity="$rarity" :labels="$labels" :locale="$locale" />
        </h3>
        @if ($description)<div data-slot="card-description" class="text-body-sm text-muted-foreground"><span dir="auto">{{ $description }}</span></div>@endif
    </div>
    <div data-slot="card-content" class="flex flex-col gap-2 px-4 pb-4">
        <div class="flex items-center justify-between gap-2">
            @if ($cost !== null)
                <span class="inline-flex items-center gap-1 text-label tabular-nums text-foreground">
                    <x-lucide-sparkles aria-hidden="true" class="size-4 text-nq-accent-text" />
                    <bdi>{{ nq_gm_say($t, 'cost', nq_gm_num($cost, $locale), $costUnit ?? $t['points']) }}</bdi>
                </span>
            @else
                <span></span>
            @endif
            @if ($status === 'owned')
                <x-nq::badge variant="success"><x-lucide-check aria-hidden="true" />{{ $t['claimed'] }}</x-nq::badge>
            @elseif ($status === 'locked')
                <x-nq::badge variant="outline"><x-lucide-lock aria-hidden="true" />{{ $t['locked'] }}</x-nq::badge>
            @elseif ($canClaim)
                <button type="button" data-slot="button" class="{{ $btn }}" x-on:click="claim()" x-bind:disabled="busy" x-bind:aria-busy="busy ? 'true' : 'false'" x-bind:data-disabled="busy ? '' : null">
                    <x-nq::spinner x-show="busy" style="display: none" />
                    <span x-show="! busy">{{ $t['claim'] }}</span>
                    <span x-show="busy" style="display: none">{{ $t['claiming'] }}</span>
                </button>
            @else
                <button type="button" data-slot="button" class="{{ $btn }}" disabled data-disabled>{{ $t['claim'] }}</button>
            @endif
        </div>
        @if ($status === 'locked' && $lockedReason)<p class="text-caption text-muted-foreground">{{ $lockedReason }}</p>@endif
        @if ($status === 'available' && $short > 0)<p class="text-caption text-muted-foreground">{{ nq_gm_say($t, 'needMore', nq_gm_num($short, $locale)) }}</p>@endif
        <p role="alert" class="text-caption text-nq-danger-text" x-show="error" x-text="error" style="display: none"></p>
    </div>
</div>
