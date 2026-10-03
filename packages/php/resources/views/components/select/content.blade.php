{{-- <x-nq::select.content> items </x-nq::select.content>
     Teleported to <body>, anchored under the trigger and as wide as it. --}}
<template x-teleport="body">
    <div data-slot="{{ $attributes->get('data-slot', 'select-content') }}" x-ref="popup" x-bind="popup" x-nq-presence="open" x-anchor.bottom-start.offset.4="$refs.trigger"
        {{ $attributes->except('data-slot')->cn([
            'z-50 min-w-[var(--anchor-width)] max-h-[var(--available-height)] overflow-y-auto rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none',
            'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
        ]) }}>
        {{ $slot }}
    </div>
</template>
