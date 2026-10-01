{{-- <x-nq::dropdown-menu.sub-trigger>More</x-nq::dropdown-menu.sub-trigger>
     An item that opens its submenu (ArrowRight, or ArrowLeft in RTL; or hover). Appends a chevron that mirrors in RTL. --}}
@props(['disabled' => false])
<div data-slot="dropdown-menu-sub-trigger" role="menuitem" x-ref="subtrigger" x-bind="subTrigger"
    @if ($disabled) data-disabled aria-disabled="true" @endif
    {{ $attributes->cn([
        'relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control px-2.5 text-body-sm text-foreground outline-none',
        'data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50',
        '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
        'data-popup-open:bg-nq-selected',
    ]) }}>{{ $slot }}<x-nq::icon name="chevron-right" directional class="ms-auto" /></div>
