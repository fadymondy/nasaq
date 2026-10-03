{{-- <x-nq::popover.trigger variant="outline">Details</x-nq::popover.trigger>
     A Nasaq button (takes the button props) that opens the popover. --}}
<x-nq::button x-bind:data-popup-open="open ? '' : undefined"
    {{ $attributes->merge(['data-slot' => 'popover-trigger', 'x-ref' => 'trigger', 'aria-haspopup' => 'dialog', 'x-on:click' => 'toggle()', ':aria-expanded' => 'open']) }}>{{ $slot }}</x-nq::button>
