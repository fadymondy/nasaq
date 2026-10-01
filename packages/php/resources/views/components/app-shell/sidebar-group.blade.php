{{-- <x-nq::app-shell.sidebar-group label="Workspace"> <x-slot:action>...</x-slot:action> items </x-nq::app-shell.sidebar-group>
     A labelled section of the sidebar. label is the heading, the action slot an icon button at its inline end, and collapsible lets the user fold the group by its label (default-open: start open, default true).
     On the collapsed rail the label hides, a hairline separates groups, and a collapsible group stays open. --}}
@props(['label' => null, 'collapsible' => false, 'defaultOpen' => true, 'action' => null])
@php
    $hasAction = $action !== null && ! $action->isEmpty();
    $labelRow = 'group/label flex h-[calc(var(--spacing-nav-row)-4px)] items-center gap-1 ps-2 pe-1 group-data-collapsed/sidebar:hidden';
@endphp
@if ($collapsible)
    <div data-slot="sidebar-group" role="group" @if ($label) x-bind:aria-label="(rail && collapsed) ? @js($label) : null" @endif {{ $attributes }}>
    <x-nq::collapsible :open="$defaultOpen" class="group/group flex flex-col">
        @if ($label)
            <div class="{{ $labelRow }}">
                <button type="button" x-on:click="toggle()" x-bind:aria-expanded="open"
                    class="flex min-w-0 flex-1 items-center gap-1 rounded-[3px] text-start text-caption font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-3">
                    <span class="truncate">{{ $label }}</span>
                    <x-lucide-chevron-right aria-hidden="true" class="opacity-0 transition-[rotate,opacity] duration-200 ease-nq group-hover/label:opacity-100 group-focus-within/label:opacity-100 group-data-open/group:rotate-90 rtl:-scale-x-100 rtl:group-data-open/group:-rotate-90" />
                </button>
                @if ($hasAction){{ $action }}@endif
            </div>
        @endif
        <x-nq::collapsible.panel class="group-data-collapsed/sidebar:block! group-data-collapsed/sidebar:h-auto! group-data-collapsed/sidebar:opacity-100!">
            <div class="flex flex-col gap-0.5">{{ $slot }}</div>
        </x-nq::collapsible.panel>
    </x-nq::collapsible>
    </div>
@else
    <div data-slot="sidebar-group" role="group" @if ($label) x-bind:aria-label="(rail && collapsed) ? @js($label) : null" @endif
        {{ $attributes->cn('flex flex-col group-data-collapsed/sidebar:border-t group-data-collapsed/sidebar:border-border group-data-collapsed/sidebar:pt-3 group-data-collapsed/sidebar:first:border-0 group-data-collapsed/sidebar:first:pt-0') }}>
        @if ($label || $hasAction)
            <div class="{{ $labelRow }}">
                <div class="min-w-0 flex-1 truncate text-caption font-medium text-muted-foreground">{{ $label }}</div>
                @if ($hasAction){{ $action }}@endif
            </div>
        @endif
        <div class="flex flex-col gap-0.5">{{ $slot }}</div>
    </div>
@endif
