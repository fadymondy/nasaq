{{-- <x-nq::drawer.trigger>Open drawer</x-nq::drawer.trigger>
     A Nasaq button (takes the button props) that opens the drawer. --}}
<x-nq::button {{ $attributes->merge(['data-slot' => 'drawer-trigger', 'aria-haspopup' => 'dialog', 'x-on:click' => 'show()', ':aria-expanded' => 'open']) }}>{{ $slot }}</x-nq::button>
