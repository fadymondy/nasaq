{{-- <x-nq::app-shell.sidebar-nest label="Projects"> <x-slot:icon><x-lucide-folder /></x-slot:icon> <x-nq::app-shell.sidebar-sub-item href="/a">Website</x-nq::app-shell.sidebar-sub-item> </x-nq::app-shell.sidebar-nest>
     A parent item that expands to sub-items. active marks the parent when a child is the current page; default-open starts it open.
     On the collapsed rail the icon opens a flyout beside the rail with the sub-items (hover or click). --}}
@props(['label', 'active' => false, 'defaultOpen' => false, 'icon' => null])
@php
    $row = implode(' ', [
        'relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] w-full items-center gap-2 rounded-control px-2 text-start text-body-sm text-sidebar-foreground',
        'transition-colors duration-150 ease-nq outline-none hover:bg-nq-hover hover:text-foreground',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
        '[&_svg]:size-4 [&_svg]:shrink-0',
    ]);
    $hasIcon = $icon !== null && ! $icon->isEmpty();
    $physical = \Nasaq\Nasaq::rtl() ? 'left-start' : 'right-start';
@endphp
<div data-slot="sidebar-nest" class="contents">
    {{-- Expanded: an in-place collapsible. Hidden on the rail, which has no room. --}}
    <x-nq::collapsible :open="$defaultOpen || $active" class="group/nest flex flex-col group-data-collapsed/sidebar:hidden">
        <button type="button" x-on:click="toggle()" x-bind:aria-expanded="open"
            class="{{ $row }} {{ $active ? 'font-medium text-foreground' : '' }}">
            @if ($hasIcon)<span data-slot="sidebar-icon" class="contents">{{ $icon }}</span>@endif
            <span class="min-w-0 flex-1 truncate">{{ $label }}</span>
            <x-lucide-chevron-right aria-hidden="true" class="ms-auto size-3.5! text-muted-foreground transition-[rotate] duration-200 ease-nq group-data-open/nest:rotate-90 rtl:-scale-x-100 rtl:group-data-open/nest:-rotate-90" />
        </button>
        <x-nq::collapsible.panel>
            <div class="ms-4 mt-0.5 flex flex-col gap-0.5 border-s border-border ps-2">{{ $slot }}</div>
        </x-nq::collapsible.panel>
    </x-nq::collapsible>
    {{-- Collapsed rail: the icon opens a flyout with the sub-items. --}}
    <div data-slot="sidebar-nest-rail" x-data="nqRailFlyout" x-id="['nq-flyout']" class="hidden group-data-collapsed/sidebar:contents">
        <button type="button" x-ref="trigger" aria-label="{{ $label }}" aria-haspopup="dialog" x-bind:aria-expanded="open"
            x-on:click="toggle()" x-on:pointerenter="hover(true)" x-on:pointerleave="hover(false)" x-bind:data-popup-open="open ? '' : undefined"
            class="{{ $row }} justify-center px-0 size-control data-popup-open:bg-nq-hover data-popup-open:text-foreground {{ $active ? 'bg-nq-selected font-medium text-foreground' : '' }}">
            {{ $icon }}
        </button>
        <template x-teleport="body">
            <div data-slot="sidebar-nest-flyout" x-bind="popup" x-nq-presence="open" x-anchor.{{ $physical }}.offset.8="$refs.trigger"
                class="z-50 w-auto min-w-44 rounded-floating border border-border bg-popover p-1 text-popover-foreground shadow-floating outline-none transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
                <div :id="$id('nq-flyout', 'title')" class="px-2 pt-1 pb-1.5 text-caption font-medium text-muted-foreground">{{ $label }}</div>
                <div class="flex flex-col gap-0.5">{{ $slot }}</div>
            </div>
        </template>
    </div>
</div>
