{{-- <x-nq::navigation-menu.trigger>Products</x-nq::navigation-menu.trigger>   opens the content of the item it sits in. --}}
@aware(['value' => null])
<button data-slot="{{ $attributes->get('data-slot', 'navigation-menu-trigger') }}" x-bind="trigger(@js($value))" aria-expanded="false"
    {{ $attributes->except('data-slot')->cn([
        'inline-flex h-control min-h-[var(--nq-touch-min,0px)] select-none items-center justify-center gap-1.5 rounded-control px-3 text-label text-foreground no-underline outline-none',
        'transition-colors duration-150 ease-nq hover:bg-nq-hover data-popup-open:bg-nq-selected data-pressed:bg-nq-selected',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
    ]) }}>
    {{ $slot }}
    <span x-bind:data-popup-open="value === @js($value) ? '' : undefined"
        class="inline-flex transition-transform duration-200 ease-nq data-popup-open:rotate-180 motion-reduce:transition-none"><x-lucide-chevron-down aria-hidden="true" class="size-4 text-muted-foreground" /></span>
</button>
