{{-- <x-nq::context-menu.content> items </x-nq::context-menu.content>
     Teleported to <body> and placed at the pointer (flipped to stay on screen; mirrors in RTL). Arrow keys, Home, End and type-ahead move; Escape closes. --}}
<template x-teleport="body">
    <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open"
        {{ $attributes->cn([
            'fixed z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none',
            'max-h-[var(--available-height)] overflow-y-auto',
            'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
        ]) }}>{{ $slot }}</div>
</template>
