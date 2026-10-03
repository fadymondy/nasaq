{{-- <x-nq::dialog.trigger variant="danger">Delete project</x-nq::dialog.trigger>
     A Nasaq button (takes the button props) that opens the dialog. --}}
<x-nq::button {{ $attributes->merge(['data-slot' => 'dialog-trigger', 'aria-haspopup' => 'dialog', 'x-on:click' => 'show()', ':aria-expanded' => 'open']) }}>{{ $slot }}</x-nq::button>
