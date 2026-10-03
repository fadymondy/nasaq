{{-- <x-nq::alert-dialog.content> header, footer </x-nq::alert-dialog.content>
     Teleported to <body>, focus-trapped, closes on Escape. No × button and no backdrop-click dismissal: the user must pick an answer. --}}
@php
    $fade = 'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
@endphp
<template x-teleport="body">
    <div data-slot="alert-dialog-portal">
        <div data-slot="alert-dialog-backdrop" x-nq-presence="open" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 {{ $fade }}"></div>
        <div data-slot="{{ $attributes->get('data-slot', 'alert-dialog-content') }}" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open"
            {{ $attributes->except('data-slot')->cn([
                'fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-md gap-4',
                'rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none',
                'max-h-[calc(100dvh-2rem)] overflow-y-auto',
                $fade,
            ]) }}>
            {{ $slot }}
        </div>
    </div>
</template>
