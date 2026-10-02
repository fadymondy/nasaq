{{-- The row of tabs. variant: segmented (default, a tinted track) | underline (a line under the active tab, for page sections).
     Put an <x-nq::tabs.indicator /> last inside it. --}}
@aware(['orientation' => 'horizontal'])
@props(['variant' => 'segmented'])
<div data-slot="{{ $attributes->get('data-slot', 'tabs-list') }}" data-variant="{{ $variant }}" aria-orientation="{{ $orientation }}" x-bind="list"
    {{ $attributes->except('data-slot')->cn([
        'relative z-0 flex max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        $variant === 'segmented' ? 'w-fit gap-0.5 rounded-control bg-secondary p-0.5' : 'gap-4 border-b border-border',
    ]) }}>
    {{ $slot }}
</div>
