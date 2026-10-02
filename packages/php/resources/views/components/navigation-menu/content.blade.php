{{-- <x-nq::navigation-menu.content> link list, layout... </x-nq::navigation-menu.content>   the panel of the item it sits in.
     It lives in its item until opened; the runtime moves it into the shared panel under the bar, and slides it with
     data-starting-style / data-ending-style and data-activation-direction. --}}
@aware(['value' => null])
<div data-slot="{{ $attributes->get('data-slot', 'navigation-menu-content') }}" x-bind="content(@js($value))" style="display: none"
    {{ $attributes->except('data-slot')->cn([
        'h-full w-max min-w-64 max-w-[min(100vw-2rem,52rem)] p-3',
        'transition-[opacity,translate] duration-300 ease-nq motion-reduce:transition-none',
        'data-starting-style:opacity-0 data-ending-style:opacity-0',
        'data-starting-style:data-[activation-direction=left]:-translate-x-1/2 data-starting-style:data-[activation-direction=right]:translate-x-1/2',
        'data-ending-style:data-[activation-direction=left]:translate-x-1/2 data-ending-style:data-[activation-direction=right]:-translate-x-1/2',
    ]) }}>{{ $slot }}</div>
