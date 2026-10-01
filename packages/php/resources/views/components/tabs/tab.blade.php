{{-- <x-nq::tabs.tab value="board">Board</x-nq::tabs.tab>: give it the same value as its panel. --}}
@aware(['variant' => 'segmented', 'defaultValue' => null])
@props(['value', 'disabled' => false])
<button type="button" data-slot="tabs-tab" x-bind="tab(@js($value))"
    @if ($defaultValue !== null && (string) $defaultValue === (string) $value) data-active aria-selected="true" @endif
    @if ($disabled) disabled data-disabled @endif
    {{ $attributes->cn([
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq',
        'hover:text-foreground data-active:text-foreground [&_svg]:size-4 [&_svg]:shrink-0',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        $variant === 'segmented' ? 'h-7 rounded-[calc(var(--radius-control)-2px)] px-3' : 'h-9 px-0.5',
    ]) }}>{{ $slot }}</button>
