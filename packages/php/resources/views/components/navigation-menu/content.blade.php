{{-- <x-nq::navigation-menu.content> link list, layout... </x-nq::navigation-menu.content>   the panel of the item it sits in. --}}
@aware(['value' => null])
<div data-slot="navigation-menu-positioner" x-bind="content(@js($value))" x-nq-presence="value === @js($value)" style="display: none"
    class="absolute start-0 top-full z-50 mt-2 origin-top rounded-floating border border-border bg-popover text-popover-foreground shadow-floating outline-none transition-[opacity,scale] duration-300 ease-nq motion-reduce:transition-none data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-150">
    <div data-slot="navigation-menu-content"
        {{ $attributes->cn(['h-full w-max min-w-64 max-w-[min(100vw-2rem,52rem)] p-3']) }}>{{ $slot }}</div>
</div>
