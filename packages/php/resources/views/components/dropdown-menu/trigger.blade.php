{{-- <x-nq::dropdown-menu.trigger>Actions</x-nq::dropdown-menu.trigger>
     A Nasaq button (takes the button props) that opens the menu. ArrowDown, Enter or Space open it with the first item focused. --}}
<x-nq::button x-bind="trigger"
    {{ $attributes->merge(['data-slot' => 'dropdown-menu-trigger', 'x-ref' => 'trigger']) }}>{{ $slot }}</x-nq::button>
