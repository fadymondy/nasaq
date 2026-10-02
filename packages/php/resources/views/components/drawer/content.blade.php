{{-- <x-nq::drawer.content> header, body, footer </x-nq::drawer.content>
     show-handle: the drag handle, and swipe-down-to-close (default true).
     show-close: the × in the corner (default true). close-label: its label (Close / إغلاق). --}}
@props(['showHandle' => true, 'showClose' => true, 'closeLabel' => null])
<template x-teleport="body">
    <div data-slot="drawer-portal">
        <div data-slot="drawer-backdrop" x-nq-presence="open" x-on:click="close()" class="fixed inset-0 z-50 bg-nq-fg/10 transition-opacity duration-200 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none dark:bg-nq-bg/60"></div>
        <div data-slot="{{ $attributes->get('data-slot', 'drawer-content') }}" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open"
            :data-dragging="dragAttr" :style="shift"
            {{ $attributes->except('data-slot')->cn([
                'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-xl flex-col rounded-t-floating border border-b-0 border-border bg-popover text-popover-foreground shadow-floating outline-none',
                'transition-[translate,opacity] duration-200 ease-nq data-starting-style:translate-y-8 data-starting-style:opacity-0 data-ending-style:translate-y-8 data-ending-style:opacity-0',
                'data-dragging:transition-none motion-reduce:transition-none',
            ]) }}>
            @if ($showHandle)
                <div data-slot="drawer-handle" aria-hidden="true" x-bind="handle" class="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing">
                    <span class="h-1 w-10 rounded-full bg-nq-line-strong"></span>
                </div>
            @endif
            {{ $slot }}
            @if ($showClose)
                <button type="button" data-slot="drawer-close" x-on:click="close()" aria-label="{{ $closeLabel ?? \Nasaq\Nasaq::t('Close', 'إغلاق') }}"
                    class="absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-x /></button>
            @endif
        </div>
    </div>
</template>
