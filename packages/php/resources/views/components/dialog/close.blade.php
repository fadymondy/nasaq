{{-- <x-nq::dialog.close variant="ghost">Cancel</x-nq::dialog.close>
     A Nasaq button (takes the button props) that closes the dialog. Add wire:click to act as well. --}}
<x-nq::button {{ $attributes->merge(['data-slot' => 'dialog-close', 'x-on:click' => 'close()']) }}>{{ $slot }}</x-nq::button>
