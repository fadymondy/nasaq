{{-- <x-nq::select.item value="bug">Bug</x-nq::select.item>
     One choice. value must not be empty. --}}
@props(['value', 'disabled' => false])
<div data-slot="select-item" x-bind="item(@js($value), @js((bool) $disabled))"
    {{ $attributes->cn([
        'relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none',
        'data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50',
    ]) }}>
    <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <span x-show="isSelected(@js($value))" x-cloak class="contents"><x-lucide-check class="size-4" /></span>
    </span>
    <span data-slot="select-item-text" class="min-w-0 flex-1 truncate">{{ $slot }}</span>
</div>
