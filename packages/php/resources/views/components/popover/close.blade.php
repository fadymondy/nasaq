{{-- <x-nq::popover.close size="sm">Got it</x-nq::popover.close>
     A Nasaq button (takes the button props) that closes the popover. --}}
<x-nq::button {{ $attributes->merge(['data-slot' => 'popover-close', 'x-on:click' => 'close()']) }}>{{ $slot }}</x-nq::button>
