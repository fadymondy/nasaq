{{-- <x-nq::context-menu.item shortcut="⌘D" variant="danger"><x-lucide-trash-2 /> Delete</x-nq::context-menu.item>
     One action. Listen with x-on:click on the item. variant: default | danger. shortcut: a hint at the inline end. disabled: boolean. --}}
@props(['variant' => 'default', 'shortcut' => null, 'disabled' => false])
<div data-slot="{{ $attributes->get('data-slot', 'context-menu-item') }}" role="menuitem" data-variant="{{ $variant }}" x-bind="item"
    @if ($disabled) data-disabled aria-disabled="true" @endif
    {{ $attributes->except('data-slot')->cn([
        'relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control px-2.5 text-body-sm text-foreground outline-none',
        'data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50',
        '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
        $variant === 'danger' ? 'text-nq-danger-text [&_svg]:text-current' : null,
    ]) }}>{{ $slot }}@if ($shortcut)<x-nq::context-menu.shortcut>{{ $shortcut }}</x-nq::context-menu.shortcut>@endif</div>
