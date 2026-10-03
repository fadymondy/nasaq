{{-- <x-nq::context-menu.trigger class="rounded-card border p-6">Right-click here</x-nq::context-menu.trigger>
     The region that opens the menu on secondary click, long-press, Shift+F10 or the Menu key. Inputs and links keep the browser menu, and so does Shift + right-click. Style it with class. --}}
<div data-slot="{{ $attributes->get('data-slot', 'context-menu-trigger') }}" x-bind="trigger" {{ $attributes->except('data-slot')->merge(['x-ref' => 'trigger']) }}>{{ $slot }}</div>
