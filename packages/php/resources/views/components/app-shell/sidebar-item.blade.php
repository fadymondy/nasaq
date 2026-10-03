{{-- <x-nq::app-shell.sidebar-item href="/inbox" :active="true"> <x-slot:icon><x-lucide-inbox /></x-slot:icon> Inbox <x-slot:trailing>3</x-slot:trailing> </x-nq::app-shell.sidebar-item>
     A sidebar link. Active = background + stronger text, never colour alone. On the collapsed rail the label hides and the name moves to a tooltip and aria-label.
     tooltip: that name when the label is not plain text. as: the element (default a; use button for actions). Other attributes land on the element. --}}
@props(['active' => false, 'tooltip' => null, 'as' => 'a', 'icon' => null, 'trailing' => null])
@php
    $name = $tooltip ?? (trim(preg_replace('/\s+/', ' ', strip_tags((string) $slot))) ?: ($attributes->get('aria-label') ?: null));
    $staticLabel = $attributes->get('aria-label');
@endphp
<x-nq::app-shell.rail-tip :name="$name">
    <{{ $as }} data-slot="sidebar-item" @if ($active) aria-current="page" @endif
        @if ($name) x-bind:aria-label="(rail && collapsed) ? @js($name) : @js($staticLabel)" @endif
        {{ $attributes->except('aria-label')->merge($staticLabel && ! $name ? ['aria-label' => $staticLabel] : [])->cn([
            'relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] w-full items-center gap-2 rounded-control px-2 text-start text-body-sm text-sidebar-foreground',
            'transition-colors duration-150 ease-nq outline-none hover:bg-nq-hover hover:text-foreground',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
            '[&_svg]:size-4 [&_svg]:shrink-0',
            'group-data-collapsed/sidebar:size-control group-data-collapsed/sidebar:justify-center group-data-collapsed/sidebar:px-0',
            'bg-nq-selected font-medium text-foreground' => $active,
        ]) }}>
        @if ($icon !== null && ! $icon->isEmpty())<span data-slot="sidebar-icon" class="contents">{{ $icon }}</span>@endif
        <span class="min-w-0 flex-1 truncate group-data-collapsed/sidebar:hidden">{{ $slot }}</span>
        @if ($trailing !== null && ! $trailing->isEmpty())<span class="ms-auto text-caption text-muted-foreground tabular-nums group-data-collapsed/sidebar:hidden">{{ $trailing }}</span>@endif
    </{{ $as }}>
</x-nq::app-shell.rail-tip>
