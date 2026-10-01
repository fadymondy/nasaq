{{-- <x-nq::upgrade-prompt.banner tone="warning" title="Your trial ends in 3 days" description="Pick a plan to keep your projects." dismissible> <x-slot:action><x-nq::button size="sm" variant="primary">Choose a plan</x-nq::button></x-slot:action> </x-nq::upgrade-prompt.banner>
     A strip across the top of a page: a trial ending, a limit near, an offer. One at a time.
     tone: brand (an offer or trial, default) | warning (a limit is near or the trial is ending). title, description. <x-slot:icon> replaces the sparkles; <x-slot:action> is the button.
     dismissible adds a dismiss button that hides the banner (needs the Alpine runtime) and fires nq:dismiss. Only for offers; never for a limit the person has actually hit.
     dismiss-label / labels: overrides for the built-in strings. --}}
@props(['tone' => 'brand', 'title' => null, 'description' => null, 'icon' => null, 'action' => null, 'dismissible' => false, 'dismissLabel' => null, 'labels' => []])
@include('nasaq::components.upgrade-prompt._strings')
@php
    $tone = $tone === 'warning' ? 'warning' : 'brand';
    $t = nq_upgrade_labels((array) $labels);
    $hasIcon = $icon && ! $icon->isEmpty();
    $hasAction = $action && ! $action->isEmpty();
@endphp
<div data-slot="upgrade-banner" data-tone="{{ $tone }}" role="region" @if (filled($title)) aria-label="{{ $title }}" @endif
    @if ($dismissible) x-data="nqUpgradeBanner()" x-modelable="open" x-show="open" @endif
    {{ $attributes->cn([
        '@container flex items-center gap-3 rounded-card px-4 py-3',
        $tone === 'brand' ? 'bg-[color-mix(in_oklab,var(--nq-brand)_10%,var(--nq-surface))] ring-1 ring-nq-brand/25' : 'bg-nq-warning-soft ring-1 ring-nq-warning/30',
    ]) }}>
    <span class="{{ \Nasaq\Cn::merge('grid size-8 shrink-0 place-items-center rounded-full [&_svg]:size-4', $tone === 'brand' ? 'bg-primary text-primary-foreground' : 'bg-nq-surface text-nq-warning-text ring-1 ring-nq-warning/40') }}">
        @if ($hasIcon){{ $icon }}@else<x-lucide-sparkles aria-hidden="true" />@endif
    </span>
    <div class="flex min-w-0 flex-1 flex-col gap-2 @xl:flex-row @xl:items-center @xl:gap-4">
        <div class="min-w-0 flex-1">
            <p class="{{ \Nasaq\Cn::merge('text-label', $tone === 'brand' ? 'text-foreground' : 'text-nq-warning-text') }}">{{ $title }}</p>
            @if (filled($description))<p class="text-body-sm text-muted-foreground">{{ $description }}</p>@endif
        </div>
        @if ($hasAction)<div class="shrink-0">{{ $action }}</div>@endif
    </div>
    @if ($dismissible)
        <x-nq::button variant="ghost" size="icon" aria-label="{{ $dismissLabel ?? $t['dismiss'] }}" x-on:click="dismiss()" class="size-7 shrink-0 self-start"><x-lucide-x aria-hidden="true" /></x-nq::button>
    @endif
</div>
