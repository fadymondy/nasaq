{{-- The moving highlight behind (segmented) or under (underline) the active tab. The runtime sets --active-tab-*. --}}
@aware(['variant' => 'segmented'])
<span data-slot="tabs-indicator" aria-hidden="true"
    {{ $attributes->cn([
        'absolute -z-10 transition-[left,width] duration-200 ease-nq',
        'left-[var(--active-tab-left)] w-[var(--active-tab-width)]',
        $variant === 'segmented'
            ? 'top-[var(--active-tab-top)] h-[var(--active-tab-height)] rounded-[calc(var(--radius-control)-2px)] bg-background shadow-xs'
            : 'bottom-0 h-0.5 rounded-full bg-primary',
    ]) }}></span>
