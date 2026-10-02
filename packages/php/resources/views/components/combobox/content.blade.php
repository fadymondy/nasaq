{{-- <x-nq::combobox.content> empty + items </x-nq::combobox.content>
     Teleported to <body>, anchored under the control and as wide as it. --}}
<template x-teleport="body">
    <div data-slot="{{ $attributes->get('data-slot', 'combobox-content') }}" x-ref="popup" x-bind="popup" x-nq-presence="open" x-anchor.bottom-start.offset.4="$refs.anchor"
        {{ $attributes->except('data-slot')->cn([
            'z-50 w-[var(--anchor-width)] max-h-[min(var(--available-height),20rem)] overflow-y-auto rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none',
            'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
        ]) }}>
        {{ $slot }}
    </div>
</template>
