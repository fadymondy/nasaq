{{-- <x-nq::dialog.content> header, body, footer </x-nq::dialog.content>
     Teleported to <body>, focus-trapped, closes on Escape and backdrop click.
     show-close: the × in the corner (default true). close-label: its label (Close / إغلاق). --}}
@props(['showClose' => true, 'closeLabel' => null])
@php
    $fade = 'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
@endphp
<template x-teleport="body">
    <div data-slot="dialog-portal">
        <div data-slot="dialog-backdrop" x-nq-presence="open" x-on:click="close()" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 {{ $fade }}"></div>
        <div data-slot="dialog-content" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open"
            {{ $attributes->cn([
                'fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-lg gap-4',
                'rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none',
                'max-h-[calc(100dvh-2rem)] overflow-y-auto',
                $fade,
            ]) }}>
            {{ $slot }}
            @if ($showClose)
                <button type="button" data-slot="dialog-close" x-on:click="close()" aria-label="{{ $closeLabel ?? \Nasaq\Nasaq::t('Close', 'إغلاق') }}"
                    class="absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-x /></button>
            @endif
        </div>
    </div>
</template>
