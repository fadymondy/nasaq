{{-- <x-nq::sheet.trigger>Edit project</x-nq::sheet.trigger>
     A Nasaq button (takes the button props) that opens the sheet. --}}
<x-nq::button {{ $attributes->merge(['data-slot' => 'sheet-trigger', 'aria-haspopup' => 'dialog', 'x-on:click' => 'show()', ':aria-expanded' => 'open']) }}>{{ $slot }}</x-nq::button>
