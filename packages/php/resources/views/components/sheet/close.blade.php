{{-- <x-nq::sheet.close variant="ghost">Cancel</x-nq::sheet.close>
     A Nasaq button (takes the button props) that closes the sheet. Add wire:click to act as well. --}}
<x-nq::button {{ $attributes->merge(['data-slot' => 'sheet-close', 'x-on:click' => 'close()']) }}>{{ $slot }}</x-nq::button>
