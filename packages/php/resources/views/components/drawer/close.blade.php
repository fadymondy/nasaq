{{-- <x-nq::drawer.close variant="ghost">Cancel</x-nq::drawer.close>
     A Nasaq button (takes the button props) that closes the drawer. Add wire:click to act as well. --}}
<x-nq::button {{ $attributes->merge(['data-slot' => 'drawer-close', 'x-on:click' => 'close()']) }}>{{ $slot }}</x-nq::button>
