{{-- <x-nq::toggle-group.toggle value="list">List</x-nq::toggle-group.toggle>
     One pressed-state button inside a toggle group. Give icon-only items an aria-label.
     On its own (standalone, wire:model works on pressed) it looks like an outline button: <x-nq::toggle-group.toggle standalone>Bold</x-nq::toggle-group.toggle> --}}
@aware(['variant' => 'segmented', 'defaultValue' => [], 'disabled' => false])
@props(['value' => null, 'standalone' => false, 'pressed' => false])
@php
    $standalone = (bool) $standalone;
    $on = $standalone ? (bool) $pressed : in_array((string) $value, array_map('strval', (array) $defaultValue), true);
    $off = (! $standalone && ($disabled ?? false)) || $attributes->flag('disabled');
    $look = $standalone
        ? 'rounded-control border border-border bg-card data-pressed:border-primary data-pressed:bg-nq-selected data-pressed:text-foreground'
        : ($variant === 'segmented'
            ? 'rounded-[calc(var(--radius-control)-2px)] data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-xs'
            : 'border border-border bg-card first:rounded-s-control last:rounded-e-control not-first:-ms-px data-pressed:z-1 data-pressed:border-primary data-pressed:bg-nq-selected data-pressed:text-foreground');
@endphp
<button type="button" data-slot="{{ $attributes->get('data-slot', 'toggle') }}" aria-pressed="{{ $on ? 'true' : 'false' }}"
    @if ($standalone) x-data="nqToggle(@js((bool) $pressed))" x-modelable="pressed" x-bind="root" @else x-bind="toggle(@js((string) $value))" @endif
    @if ($on) data-pressed @endif
    @if ($off) disabled data-disabled @endif
    {{ $attributes->except('data-slot')->except('disabled')->cn([
        'inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-label text-muted-foreground outline-none',
        'transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        $look,
    ]) }}>{{ $slot }}</button>
