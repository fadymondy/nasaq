{{-- <x-nq::combobox.item value="sa">Saudi Arabia</x-nq::combobox.item>
     One choice. value must not be empty. The text is what the filter matches and what the input shows once picked. --}}
@props(['value', 'disabled' => false])
<div data-slot="{{ $attributes->get('data-slot', 'combobox-item') }}" x-bind="item(@js($value), @js((bool) $disabled))"
    {{ $attributes->except('data-slot')->cn([
        'relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none',
        'data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50',
    ]) }}>
    <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <span x-show="isSelected(@js($value))" x-cloak class="contents"><x-lucide-check class="size-4" /></span>
    </span>
    <span data-slot="combobox-item-text" class="min-w-0 flex-1 truncate">{{ $slot }}</span>
</div>
